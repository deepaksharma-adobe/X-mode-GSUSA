export default async function decorate(block) {
  const [row] = block.children;
  const cells = row ? [...row.children] : [];
  const [headingCell, linkCell] = cells;

  block.textContent = '';

  const inner = document.createElement('div');
  inner.classList.add('need-help-inner');

  if (headingCell) {
    const heading = document.createElement('p');
    heading.classList.add('need-help-heading');
    // Unwrap a single authored <p> so we don't nest paragraphs.
    const sole = headingCell.firstElementChild;
    if (headingCell.childElementCount === 1 && sole.tagName === 'P') {
      heading.append(...sole.childNodes);
    } else {
      heading.append(...headingCell.childNodes);
    }
    inner.append(heading);
  }

  if (linkCell) {
    const link = linkCell.querySelector('a');
    if (link) {
      link.classList.add('button', 'text-secondary', 'need-help-link');
      inner.append(link);
    }
  }

  block.append(inner);
}
