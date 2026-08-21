#!/usr/bin/env python3
"""Validate the generated publication dataset and its static-site integration."""

from __future__ import annotations

import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
EXPECTED_YEAR_COUNTS = {
    2026: 11,
    2025: 22,
    2024: 21,
    2023: 11,
    2022: 15,
    2021: 14,
    2020: 5,
    2019: 3,
}


class SiteParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.local_references: list[str] = []
        self.publication_ids: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag == "article" and "publication" in (attributes.get("class") or "").split():
            publication_id = attributes.get("data-publication-id")
            if publication_id:
                self.publication_ids.append(publication_id)
        for attribute in ("href", "src"):
            reference = attributes.get(attribute)
            if reference and not urlsplit(reference).scheme and not reference.startswith(("#", "mailto:")):
                self.local_references.append(reference)


def read_dataset() -> list[dict]:
    source = (ROOT / "assets/data/publications.js").read_text(encoding="utf-8")
    match = re.fullmatch(
        r"// Generated[^\n]*\nwindow\.PUBLICATIONS_DATA = Object\.freeze\((\[.*\])\);\n?",
        source,
        flags=re.DOTALL,
    )
    assert match, "Publication data wrapper is malformed"
    return json.loads(match.group(1))


def resolve_reference(html_path: Path, reference: str) -> Path | None:
    clean = urlsplit(reference).path
    if clean == "/publications/":
        return ROOT / "publications/index.html"
    if clean.startswith("/"):
        return ROOT / clean.lstrip("/")
    return (html_path.parent / clean).resolve()


def check_html(html_path: Path) -> SiteParser:
    parser = SiteParser()
    parser.feed(html_path.read_text(encoding="utf-8"))
    for reference in parser.local_references:
        target = resolve_reference(html_path, reference)
        assert target is not None and target.exists(), f"Broken local reference in {html_path.name}: {reference}"
    return parser


def main() -> None:
    publications = read_dataset()
    assert len(publications) == 102

    ids = [publication["id"] for publication in publications]
    assert len(ids) == len(set(ids)), "Duplicate publication IDs"

    title_types = [
        (re.sub(r"\W+", "", publication["title"].casefold()), publication["itemType"])
        for publication in publications
    ]
    assert len(title_types) == len(set(title_types)), "Duplicate publication records"

    years = [publication["year"] for publication in publications]
    assert years == sorted(years, reverse=True), "Publications are not sorted by year"
    year_counts = {year: years.count(year) for year in sorted(set(years), reverse=True)}
    assert year_counts == EXPECTED_YEAR_COUNTS

    selected_ids = {publication["id"] for publication in publications if publication["selected"]}
    assert len(selected_ids) == 20
    assert sum(publication["itemType"] == "journalArticle" for publication in publications) == 46
    assert sum(publication["itemType"] == "conferencePaper" for publication in publications) == 56
    assert all(publication["sunAuthor"].startswith("C. Sun") for publication in publications)
    assert sum(bool(publication["role"]) for publication in publications) == 10
    assert sum(publication["authorsPrefix"].count("*") + publication["sunAuthor"].count("*") + publication["authorsSuffix"].count("*") for publication in publications) == 12
    assert sum(publication["authorsPrefix"].count("#") + publication["sunAuthor"].count("#") + publication["authorsSuffix"].count("#") for publication in publications) == 12

    for publication in publications:
        if publication["url"]:
            parsed = urlsplit(publication["url"])
            assert parsed.scheme == "https" and parsed.netloc
        if publication["doi"]:
            assert publication["url"].casefold() == f'https://doi.org/{publication["doi"]}'.casefold()

    homepage_path = ROOT / "index.html"
    all_page_path = ROOT / "publications/index.html"
    homepage = homepage_path.read_text(encoding="utf-8")
    all_page = all_page_path.read_text(encoding="utf-8")
    renderer = (ROOT / "assets/js/publications.js").read_text(encoding="utf-8")
    homepage_parser = check_html(homepage_path)
    check_html(all_page_path)

    assert len(homepage_parser.publication_ids) == 20
    assert set(homepage_parser.publication_ids) == selected_ids
    assert "Full List" not in homepage
    assert '>View All Publications</a>' in homepage
    assert 'href="/publications/"' in homepage
    assert '<a href="#publications">Publications</a>' in homepage
    assert '<a href="../#publications" class="is-active">Publications</a>' in all_page
    assert 'Google Scholar <span aria-hidden="true">↗</span>' in all_page
    assert 'target="_blank" rel="noreferrer"' in all_page
    assert '<strong class="legend-selected">' not in all_page
    assert 'id="publication-type-counts"' not in all_page
    assert 'link.textContent = "Online"' in renderer
    assert 'links.append("[", link, "]")' in renderer
    assert 'const links = document.createElement("span")' in renderer
    assert 'citation.append(document.createTextNode(" "), links)' in renderer
    assert 'journalArticle: "J"' in renderer
    assert 'conferencePaper: "C"' in renderer
    assert 'journalArticle: typeCounts.journalArticle' in renderer
    assert 'conferencePaper: typeCounts.conferencePaper' in renderer
    assert 'typePositions[publication.itemType] -= 1' in renderer
    assert 'yearNavigation.setAttribute("aria-label", "Publication years")' in renderer
    assert 'styles.css?v=20260821r49' in homepage
    assert 'styles.css?v=20260821r49' in all_page
    assert 'event.preventDefault()' in renderer
    assert 'scrollIntoView({' in renderer
    assert 'publications.js?v=20260821r7' in all_page

    print("Publication QA passed")
    print(f"  publications: {len(publications)}")
    print(f"  selected identities: {len(selected_ids)}")
    print("  year counts: " + ", ".join(f"{year}={count}" for year, count in year_counts.items()))
    print("  local HTML asset/route references: valid")


if __name__ == "__main__":
    main()
