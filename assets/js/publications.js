(() => {
  const publications = window.PUBLICATIONS_DATA;
  const listRoot = document.querySelector("#all-publications-list");

  if (!listRoot || !Array.isArray(publications)) return;

  const appendAnnotatedText = (parent, value) => {
    const parts = String(value).split(/([*#]+)/);
    parts.forEach((part) => {
      if (!part) return;
      if (/^[*#]+$/.test(part)) {
        const marker = document.createElement("sup");
        marker.textContent = part;
        parent.append(marker);
      } else {
        parent.append(document.createTextNode(part));
      }
    });
  };

  const typePrefixes = {
    journalArticle: "J",
    conferencePaper: "C",
  };
  const typeCounts = {
    journalArticle: 0,
    conferencePaper: 0,
  };
  const publicationNumbers = new Map();

  publications.forEach((publication) => {
    if (typePrefixes[publication.itemType]) typeCounts[publication.itemType] += 1;
  });

  const typePositions = {
    journalArticle: typeCounts.journalArticle,
    conferencePaper: typeCounts.conferencePaper,
  };

  publications.forEach((publication) => {
    const prefix = typePrefixes[publication.itemType];
    if (!prefix) return;
    publicationNumbers.set(publication.id, `${prefix}${typePositions[publication.itemType]}`);
    typePositions[publication.itemType] -= 1;
  });

  const createCitation = (publication) => {
    const item = document.createElement("li");
    item.className = "bibliography-item";
    item.dataset.publicationId = publication.id;
    if (publication.selected) item.classList.add("is-selected");

    const citation = document.createElement("p");
    citation.className = "bibliography-citation";

    const number = document.createElement("span");
    number.className = "bibliography-number";
    number.textContent = `[${publicationNumbers.get(publication.id)}]`;
    citation.append(number, document.createTextNode(" "));

    appendAnnotatedText(citation, publication.authorsPrefix);
    const sunAuthor = document.createElement("strong");
    sunAuthor.className = "bibliography-sun-author";
    appendAnnotatedText(sunAuthor, publication.sunAuthor);
    citation.append(sunAuthor);
    appendAnnotatedText(citation, publication.authorsSuffix);
    citation.append(document.createTextNode(`, “${publication.title},” `));

    if (publication.lead) {
      citation.append(document.createTextNode(`${publication.lead} `));
    }

    const venue = document.createElement("cite");
    venue.textContent = publication.venue;
    citation.append(venue, document.createTextNode(publication.details));

    if (publication.role) {
      const role = document.createElement("span");
      role.className = "bibliography-role";
      role.textContent = ` (${publication.role})`;
      citation.append(role);
    }

    if (publication.url) {
      const links = document.createElement("span");
      links.className = "bibliography-links";
      const link = document.createElement("a");
      link.href = publication.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Online";
      link.setAttribute("aria-label", `View ${publication.title} online`);
      links.append("[", link, "]");
      citation.append(document.createTextNode(" "), links);
    }

    item.append(citation);

    return item;
  };

  const years = [...new Set(publications.map(({ year }) => year))].sort((a, b) => b - a);
  const yearNavigation = document.createElement("div");
  yearNavigation.className = "bibliography-year-nav";
  yearNavigation.setAttribute("role", "navigation");
  yearNavigation.setAttribute("aria-label", "Publication years");

  const yearList = document.createElement("ol");
  yearList.className = "bibliography-year-list";
  const yearLinks = new Map();

  years.forEach((year) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.id = `publication-year-link-${year}`;
    link.href = `#publications-${year}`;
    link.textContent = String(year);
    item.append(link);
    yearList.append(item);
    yearLinks.set(year, link);
  });
  yearNavigation.append(yearList);

  const yearGroups = document.createElement("div");
  yearGroups.className = "bibliography-year-groups";
  const groups = [];

  years.forEach((year) => {
    const group = document.createElement("section");
    group.className = "bibliography-year-group";
    group.id = `publications-${year}`;
    group.dataset.year = String(year);
    group.setAttribute("aria-labelledby", `publication-year-link-${year}`);

    const entries = document.createElement("ol");
    entries.className = "bibliography-list";
    publications
      .filter((publication) => publication.year === year)
      .forEach((publication) => entries.append(createCitation(publication)));

    group.append(entries);
    yearGroups.append(group);
    groups.push(group);
  });

  listRoot.replaceChildren(yearNavigation, yearGroups);

  let activeYear;
  const setActiveYear = (year) => {
    const changed = year !== activeYear;
    activeYear = year;
    yearLinks.forEach((link, linkYear) => {
      const active = linkYear === year;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "location");
        if (changed && yearList.scrollWidth > yearList.clientWidth) {
          yearList.scrollTo({
            left: link.offsetLeft - yearList.clientWidth / 2 + link.offsetWidth / 2,
            behavior: "smooth",
          });
        }
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  let scrollFrame;
  const updateActiveYear = () => {
    const threshold = (document.querySelector(".site-header")?.offsetHeight ?? 0) + 36;
    let currentYear = years[0];
    groups.forEach((group) => {
      if (group.getBoundingClientRect().top <= threshold) currentYear = Number(group.dataset.year);
    });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      currentYear = years.at(-1);
    }
    setActiveYear(currentYear);
  };

  const queueActiveYearUpdate = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      updateActiveYear();
      scrollFrame = undefined;
    });
  };

  yearLinks.forEach((link, year) => {
    link.addEventListener("click", () => setActiveYear(year));
  });
  window.addEventListener("scroll", queueActiveYearUpdate, { passive: true });
  window.addEventListener("resize", queueActiveYearUpdate);
  updateActiveYear();
})();
