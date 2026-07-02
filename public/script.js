const buttons = {
  slc: ['U9', 'AC', 'AHA', 'AMPS', 'BIHS', 'CAS', 'BIS'],
  ag: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  categories: ['P', 'H', 'AP', 'SL', 'HL', 'PE', 'CTE'],
  grade: ['9', '10', '11', '12'],
};

const _isHome = window.location.pathname === '/';
const isEditing = window.location.pathname === '/edit';
const isPlanner = window.location.pathname === '/plan';
const isSetup = window.location.pathname === '/setup';

const cards = [...document.querySelectorAll('.card')];
const columns = [...document.querySelectorAll('.plannerColumn')];
const dropdowns = [...document.querySelectorAll('.dropdown')];
const stars = [...document.querySelectorAll('.star')];

const hamburgerMenu = document.getElementById('hamburger');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');
const messageDiv = document.getElementById('message');
const themeSwitch = document.getElementById('themeSwitch');
const miniCardsDiv = document.getElementById('miniCards');

const advancedCheck = document.getElementById('advancedCheck');
const ucBarCheck = document.getElementById('ucCheck');
const ucSwitch = document.getElementById('ucSwitch');
const ucReqBar = document.getElementById('ucBar');
const ucRecBar = document.getElementById('ucRecBar');

let currentDrag = null;
let oldParent = null;
let clonedDiv = null;
let offsetX = 0;
let offsetY = 0;

let userGrade = null;
let userSlc = null;
let userAdvanced = null;

let ucBar = null;
let ucHiddenBar = null;

let isFiltered = false;
let filterGroup = null;

const capitalizeFirst = (string) => {
  return string.substring(0, 1).toUpperCase() + string.substring(1, string.length);
};

const activateButtons = (credit, type) => {
  const url = new URL(window.location);
  let toSelect;
  if (type === 'ag') {
    toSelect = url.searchParams.get('ag') === credit;
    if (url.searchParams.has('ag', credit)) url.searchParams.delete('ag');
    else url.searchParams.set('ag', credit);
  } else {
    toSelect = url.searchParams.getAll(type).includes(credit);
    if (url.searchParams.has(type, credit)) url.searchParams.delete(type, credit);
    else url.searchParams.append(type, credit);
  }
  [...document.getElementsByClassName(credit)].forEach((button) => {
    if (button.closest('.miniCard')) return;
    if (toSelect) button.classList.add('selected');
    button.href = url.toString();
  });
};

// get data

const filterPlans = async (option, grade) => {
  const res = await fetch(`/filter-plan?option=${option}`, {
    method: 'GET',
  });

  filterGroup = option;

  miniCardsDiv.innerHTML = await res.text();
  [...miniCardsDiv.getElementsByClassName('miniCard')].forEach((card) => {
    card.onclick = () => {
      card.remove();
      const target = document.getElementById(`column${grade}`);
      target.appendChild(card);
      updateSchedule(card, grade, null, target.childElementCount, true);
      document.getElementById(filterGroup).remove();
      clearFilterPlans();
    };
  });
};

const clearFilterPlans = async () => {
  const res = await fetch('/filter-plan?option=none', {
    method: 'GET',
  });
  filterGroup = null;
  miniCardsDiv.innerHTML = await res.text();
  [...miniCardsDiv.getElementsByClassName('miniCard')].forEach((card) => droppable(card));
};

// post data

const updateCourse = async (card) => {
  if (!isEditing) return;
  const allowRegex = /allow(\d{1,2})/;
  const recRegex = /recommend(\d{1,2})/;
  const slcRegex = /\d+(.+)/;
  const courseId = card.id.substring(6, card.id.length);
  const courseTitle = card.querySelector('.courseTitle')?.textContent.trim();
  const description = card.querySelector('.description')?.textContent.trim();
  const prerequisite = card.querySelector('.prerequisite')?.textContent.trim();
  const allowedGrades = [];
  const recommendedGrades = [];
  const slcs = [];
  card.querySelectorAll('input[type = "checkbox"]').forEach((check) => {
    if (check.checked) {
      if (allowRegex.test(check.id)) allowedGrades.push(allowRegex.exec(check.id)[1]);
      else if (recRegex.test(check.id)) recommendedGrades.push(recRegex.exec(check.id)[1]);
      else slcs.push(slcRegex.exec(check.id)[1]);
    }
  });
  const update = {
    courseId,
    courseTitle,
    description,
    prerequisite,
    allowedGrades,
    recommendedGrades,
    slcs,
  };
  try {
    const res = await fetch('/update-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ update }),
    });
    const data = await res.json();
    getMessage(data);
  } catch (err) {
    console.error('Error updating data:', err);
  }
};

const updateUserInfo = async () => {
  const grade = document.getElementById('gradeDropdown').textContent;
  const slc = document.getElementById('slcDropdown').textContent;
  const isAdvanced = advancedCheck !== null ? (advancedCheck.checked ? 'true' : 'false') : null;
  if (grade.includes('Choose Grade') && slc.includes('Choose SLC') && advancedCheck === null)
    return;
  if (grade === userGrade && slc === userSlc && isAdvanced === userAdvanced) return;
  const info = {
    grade,
    slc,
    isAdvanced,
  };
  try {
    const _res = await fetch('/update-user-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ info }),
    });

    userGrade = grade;
    userSlc = slc;
    userAdvanced = isAdvanced;
  } catch (err) {
    console.error('Error updating user data:', err);
  }
};

const updateSchedule = async (course, grade, oldGrade, period, isAdding) => {
  const courseId = course.id.substring(6, course.id.length);
  const update = {
    isAdding,
    courseId,
    grade,
    oldGrade,
    period,
  };
  try {
    const res = await fetch('/update-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ update }),
    });

    const data = await res.json();
    if (!data.success && data.success !== null) {
      getMessage(data);
      course.remove();
    } else {
      updateProgressBar(capitalizeFirst(data.subject), data.newSubject);
      updateProgressBar('Elect', data.newElect);
      if (data.ag) {
        updateProgressBarAG(data.ag.toUpperCase(), data.newAg);
      }
    }
    const option = new URLSearchParams(window.location.search).get('option');
    if (isAdding && data.reqId?.includes(option)) {
      // clear url params and reload
      const params = new URLSearchParams(window.location.search);
      params.delete('option');
      const newUrl =
        window.location.pathname +
        (params.toString() ? `?${params.toString()}` : '') +
        window.location.hash;
      window.location.href = newUrl;
    }
  } catch (err) {
    console.error('Error updating schedule:', err);
  }
};

const starCourse = async (starButton, courseId) => {
  const isStarred = starButton.getAttribute('data-starred') !== 'true';
  setStar(starButton, isStarred);
  try {
    const update = {
      courseId,
      isStarred,
    };
    const res = await fetch('/update-star', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ update }),
    });

    const data = await res.json();
    if (!data.success) getMessage(data);
  } catch (err) {
    console.error('Error starring course:', err);
  }
};

const setStar = (starButton, isOn) => {
  if (isOn) {
    starButton.innerHTML = '&#9733;';
    starButton.setAttribute('data-starred', 'true');
    starButton.classList.add('starred');
  } else {
    starButton.innerHTML = '&#9734;';
    starButton.setAttribute('data-starred', 'false');
    starButton.classList.remove('starred');
  }
};

const getMessage = (data) => {
  if (data.alreadyExists) return;
  if (data.success) {
    messageDiv.innerHTML = `<span>${data.message}</span>`;
    messageDiv.classList.add('success');
  } else {
    if (data.message) {
      messageDiv.innerHTML = `<span>${data.message}</span>`;
    } else {
      messageDiv.innerHTML = '<span>Something went wrong</span>';
    }
    messageDiv.classList.add('fail');
  }
  messageDiv.classList.remove('hidden');

  setTimeout(() => {
    messageDiv.classList.add('hidden');
  }, 3000);
};

// dragging ui

const pointerDownHandler = (ev) => {
  if (currentDrag != null) return;
  currentDrag = ev.currentTarget;
  // store where the course used to be
  oldParent = currentDrag.parentElement;
  if (oldParent.id === 'miniCards') {
    clonedDiv = currentDrag.cloneNode(true);
    clonedDiv.classList.add('clone');
    currentDrag.parentNode.insertBefore(clonedDiv, currentDrag);
  }

  const rect = currentDrag.getBoundingClientRect();
  offsetX = ev.clientX - rect.left;
  offsetY = ev.clientY - rect.top;

  currentDrag.classList.add('dragging');

  document.addEventListener('pointermove', pointerMoveHandler);
  document.addEventListener('pointerup', pointerUpHandler);
};

const pointerMoveHandler = (ev) => {
  if (!currentDrag) return;

  currentDrag.style.position = 'fixed';
  currentDrag.style.left = `${ev.clientX - offsetX}px`;
  currentDrag.style.top = `${ev.clientY - offsetY}px`;
};

const pointerUpHandler = (ev) => {
  if (!currentDrag) return;

  const dropTarget = document.elementFromPoint(ev.clientX, ev.clientY);

  if (currentDrag.classList.contains('semester') && dropTarget.closest('.semesterBox')) {
    handleSemDrop(dropTarget);
  } else {
    handleDrop(dropTarget.closest('.droppable'));
  }

  if (oldParent.id === 'miniCards' && clonedDiv !== null) {
    if (oldParent === currentDrag.parentElement) {
      clonedDiv.remove();
    } else {
      clonedDiv.classList.remove('clone');
      droppable(clonedDiv);
    }
    clonedDiv = null;
  }

  if (
    oldParent.classList.contains('semesterBox') &&
    oldParent.childElementCount === 0 &&
    oldParent !== currentDrag.parentElement
  ) {
    oldParent.remove();
  }

  dropTarget.classList.remove('hovering');
  currentDrag.classList.remove('dragging');
  currentDrag.style.position = '';
  currentDrag.style.left = '';
  currentDrag.style.top = '';

  document.removeEventListener('pointermove', pointerMoveHandler);
  document.removeEventListener('pointerup', pointerUpHandler);
  currentDrag = null;
};

const droppable = (div) => {
  div.addEventListener('pointerdown', pointerDownHandler);
  div.addEventListener('pointermove', pointerMoveHandler);
  div.addEventListener('pointerup', pointerUpHandler);
};

const handleDrop = (target) => {
  let period = target.childElementCount;
  if (currentDrag.classList.contains('zero')) {
    period = 0;
  }
  if (target.id.indexOf('miniCard') !== -1 && !target.classList.contains('plannerColumn')) {
    target.appendChild(currentDrag);
    // delete schedule
    updateSchedule(currentDrag, currentDrag.getAttribute('data-grade'), null, period, false);
    const divs = target.querySelectorAll(`#${currentDrag.id}`);
    if (divs.length > 1) {
      divs[1].remove();
    }
    return;
  }
  const grade = /\d+/.exec(target.id)[0];
  currentDrag.setAttribute('data-grade', grade);
  // create a new semester box
  if (currentDrag.classList.contains('semester')) {
    const parentDiv = document.createElement('div');
    parentDiv.className = 'semesterBox';
    parentDiv.addEventListener('pointerDown', pointerDownHandler);
    parentDiv.appendChild(currentDrag);
    parentDiv.setAttribute('data-period', period);
    currentDrag.setAttribute('data-period', parentDiv.getAttribute('data-period'));
    target.appendChild(parentDiv);
    let oldGrade = null;
    if (oldParent.classList.contains('semesterBox')) {
      oldGrade = /\d+/.exec(oldParent.parentElement.id)[0];
    } else {
      oldGrade = oldParent.id === 'miniCards' ? null : /\d+/.exec(oldParent.id)[0];
    }
    updateSchedule(currentDrag, currentDrag.getAttribute('data-grade'), oldGrade, period, true);
    return;
  }
  if (currentDrag.classList.contains('zero')) {
    // put 0 period classes at the top
    target.querySelector('h2').after(currentDrag);
  } else {
    target.appendChild(currentDrag);
  }
  updateSchedule(
    currentDrag,
    currentDrag.getAttribute('data-grade'),
    oldParent.id === 'miniCards' ? null : /\d+/.exec(oldParent.id)[0],
    period,
    true,
  );
};

const handleSemDrop = (target) => {
  if (target.childElementCount > 1) {
    handleDrop(target.closest('.droppable'));
    return;
  }
  const semTarget = target.closest('.semesterBox');
  semTarget.appendChild(currentDrag);
  const grade = /\d+/.exec(semTarget.parentElement.id)[0];
  updateSchedule(
    currentDrag,
    grade,
    oldParent.id === 'miniCards' ? null : /\d+/.exec(oldParent.parentElement.id)[0],
    Number(semTarget.getAttribute('data-period')),
    true,
  );
};

// handle a-g progress bar

const setProgressBar = (bar) => {
  const sections = bar.getElementsByClassName('progress-bar');
  [...sections].forEach((section) => {
    if (section) {
      const value = section.getAttribute('data-value');
      section.style.width = `${(value / section.parentElement.getAttribute('data-value')) * 100}%`;

      if (value <= 0) {
        section.textContent = '';
      }
    }
  });
};

const updateProgressBar = (type, newCredits) => {
  const section = document.getElementById(`bar${type}`);
  const bg = document.getElementById(`barBg${type}`);
  const total = section.parentElement.getAttribute('data-value');
  section.style.width = `${(newCredits / total) * 100}%`;
  if (newCredits > 0) {
    bg.textContent = '';
    section.textContent = `${Math.min(newCredits, total)}/${total}`;
  } else {
    section.textContent = '';
    bg.textContent = `0/${total}`;
  }
};

const updateProgressBarAG = (type, newCredits) => {
  updateProgressBar(type, newCredits);
  updateProgressBar(`Rec${type}`, newCredits);
};

const updateUCBar = () => {
  if (ucBarCheck.checked) {
    ucBar.classList.remove('hidden');
    localStorage.setItem('show-uc', 'true');
  } else {
    ucBar.classList.add('hidden');
    ucHiddenBar.classList.add('hidden');
    localStorage.setItem('show-uc', 'false');
  }
};

const handleAlignment = (id) => {
  const div = document.getElementById(id);
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

  if (div.getBoundingClientRect().right > viewportWidth) {
    div.classList.add('align-right');
  } else {
    div.classList.remove('align-right');
  }
};

// handle dark mode

if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('darkMode');
  if (!isSetup) themeSwitch.checked = true;
}

window.addEventListener('load', () => {
  setTimeout(() => {
    document.body.classList.add('themeTransition');
  }, 50);
});

if (!isSetup) {
  themeSwitch.addEventListener('change', () => {
    if (themeSwitch.checked) {
      document.body.classList.add('darkMode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('darkMode');
      localStorage.setItem('theme', 'light');
    }
  });

  overlay.addEventListener('click', () => {
    sideMenu.classList.remove('open');
    overlay.classList.remove('show');
    updateUserInfo();
    window.location.reload();
  });

  hamburgerMenu.addEventListener('click', () => {
    sideMenu.classList.add('open');
    overlay.classList.add('show');
  });
}

Object.entries(buttons).forEach(([kind, labels]) => {
  labels.forEach((label) => {
    activateButtons(label, kind);
  });
});

userGrade = document.getElementById('gradeDropdown').textContent;
userSlc = document.getElementById('slcDropdown').textContent;

if (isEditing) {
  [...document.getElementsByClassName('submit')].forEach((e) => {
    e.onclick = () => {
      updateCourse(document.getElementById(`course${e.id.match(/\d+/)[0]}`));
    };
  });
}

advancedCheck.onclick = updateUserInfo;

dropdowns.forEach((dropdown) => {
  // set text to the selected option
  const options = dropdown.querySelectorAll('.dropdownContent span');
  options.forEach((option) => {
    option.addEventListener('click', () => {
      dropdown.querySelector('.dropdownButton').textContent = option.textContent;
    });
  });

  const dropdownButton = dropdown.querySelector('.dropdownButton');
  const dropdownContent = dropdown.querySelector('.dropdownContent');

  // handle mouseover and tapping to show the dropdown
  dropdown.addEventListener('mouseover', () => {
    dropdownButton.classList.add('show');
    dropdownContent.classList.add('show');
  });

  dropdown.addEventListener('click', () => {
    updateUserInfo();
    dropdownButton.classList.add('show');
    dropdownContent.classList.add('show');
  });

  dropdown.addEventListener('mouseout', () => {
    dropdownButton.classList.remove('show');
    dropdownContent.classList.remove('show');
  });
});

if (isPlanner) {
  cards.forEach((card) => droppable(card));
  columns.forEach((column) => {
    column.classList.add('droppable');
  });
  miniCardsDiv.classList.add('droppable');
  setProgressBar(document.getElementById('bhsBar'));
  setProgressBar(document.getElementById('ucBar'));
  setProgressBar(document.getElementById('ucRecBar'));

  if (localStorage.getItem('req-rec') === 'rec') {
    ucSwitch.checked = true;
    ucBar = ucRecBar;
    document.getElementById('ucReqRec').textContent = 'UC A-G Recommended';
    ucHiddenBar = ucReqBar;
  } else {
    ucSwitch.checked = false;
    ucBar = ucReqBar;
    document.getElementById('ucReqRec').textContent = 'UC A-G Required';
    ucHiddenBar = ucRecBar;
  }

  ucHiddenBar.classList.add('hidden');

  if (localStorage.getItem('show-uc') === 'true') {
    ucBarCheck.checked = true;
    ucBar.classList.remove('hidden');
  } else {
    ucBarCheck.checked = false;
    ucBar.classList.add('hidden');
  }

  ucBarCheck.addEventListener('change', () => {
    updateUCBar();
  });

  userAdvanced = advancedCheck !== null ? (advancedCheck.checked ? 'true' : 'false') : null;

  ucSwitch.addEventListener('change', () => {
    if (ucSwitch.checked) {
      localStorage.setItem('req-rec', 'rec');
      ucBar = ucRecBar;
      document.getElementById('ucReqRec').textContent = 'UC A-G Recommended';
      ucHiddenBar = ucReqBar;
    } else {
      localStorage.setItem('req-rec', 'req');
      ucBar = ucReqBar;
      document.getElementById('ucReqRec').textContent = 'UC A-G Required';
      ucHiddenBar = ucRecBar;
    }
    ucHiddenBar.classList.add('hidden');
    updateUCBar();
  });

  [...document.querySelectorAll('.option')].forEach((div) => {
    div.onclick = () => {
      isFiltered = !isFiltered;
      if (isFiltered) {
        filterPlans(div.id, /\d+/.exec(div.closest('.plannerColumn').id)[0]);
      } else {
        clearFilterPlans();
      }
    };
  });

  for (const div of document.querySelectorAll('.info')) {
    window.addEventListener('load', handleAlignment(div.id));
    window.addEventListener('scroll', handleAlignment(div.id));
    window.addEventListener('resize', handleAlignment(div.id));
  }
}

stars.forEach((star) => {
  star.onclick = () => {
    starCourse(star, star.id.match(/\d+/)[0]);
  };
});
