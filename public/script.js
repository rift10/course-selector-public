const UCOP = {
  a: 'Social Science',
  b: 'English',
  c: 'Math',
  d: 'Science',
  e: 'Foreign language',
  f: 'Visual and Performing Arts',
  g: 'Elective',
};

const isHome = window.location.pathname === '/';
const isEditing = window.location.pathname === '/edit';
const _cards = [...document.querySelectorAll('.card')];

const activateAllButtons = () => {
  Object.entries(UCOP).forEach(([letter]) => activateButtons(letter, true));
  activateButtons('P', false);
  activateButtons('H', false);
  activateButtons('AP', false);
  activateButtons('SL', false);
  activateButtons('HL', false);
  activateButtons('PE', false);
  activateButtons('CTE', false);
};

const activateButtons = (credit, isAG) => {
  const url = new URL(window.location);
  let toSelect;
  if (isAG) {
    toSelect = url.searchParams.get('ag') === credit;
    if (url.searchParams.has('ag', credit)) url.searchParams.delete('ag');
    else url.searchParams.set('ag', credit);
  } else {
    toSelect = url.searchParams.getAll('categories').includes(credit);
    if (url.searchParams.has('categories', credit)) url.searchParams.delete('categories', credit);
    else url.searchParams.append('categories', credit);
  }
  [...document.getElementsByClassName(credit)].forEach((button) => {
    if (toSelect) button.classList.add('selected');
    button.href = url.toString();
  });
};

const updateCourse = async (card) => {
  if (!isEditing) return;
  const allowRegex = /allow(\d{1,2})/;
  const recRegex = /recommend(\d{1,2})/;
  const slcRegex = /\d+(.+)/;
  const courseId = card.id;
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
    if (data.success) {
      messageDiv.innerHTML = `<span>${data.message}</span>`;
      messageDiv.classList.add('success');
    } else {
      messageDiv.innerHTML = '<span>Something went wrong</span>';
      messageDiv.classList.add('fail');
    }
    messageDiv.classList.remove('hidden');

    setTimeout(() => {
      messageDiv.classList.add('hidden');
    }, 3000);
  } catch (err) {
    console.error('Error updating data:', err);
  }
};

const updateUserInfo = async () => {
  const grade = document.getElementById('gradeDropdown').textContent;
  const slc = document.getElementById('slcDropdown').textContent;
  if (grade === 'Choose Grade' || slc === 'Choose SLC') return;
  const info = {
    grade,
    slc,
  };
  try {
    await fetch('/update-user-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ info }),
    });
  } catch (err) {
    console.error('Error creating account:', err);
  }
};

const themeSwitch = document.getElementById('themeSwitch');

if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('darkMode');
  themeSwitch.checked = true;
}

window.addEventListener('load', () => {
  setTimeout(() => {
    document.body.classList.add('themeTransition');
  }, 50);
});

themeSwitch.addEventListener('change', () => {
  if (themeSwitch.checked) {
    document.body.classList.add('darkMode');
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.remove('darkMode');
    localStorage.setItem('theme', 'light');
  }
});

activateAllButtons();
if (isHome) {
  document.getElementById('updateInfo').addEventListener('click', updateUserInfo);
}

if (isEditing) {
  [...document.getElementsByClassName('submit')].forEach((e) => {
    e.onclick = () => {
      updateCourse(document.getElementById(e.id.match(/\d+/)[0]));
    };
  });
}

const dropdowns = document.querySelectorAll('.dropdown');

dropdowns.forEach((dropdown) => {
  const options = dropdown.querySelectorAll('.dropdownContent span');
  options.forEach((option) => {
    option.addEventListener('click', () => {
      dropdown.querySelector('.dropdownButton').textContent = option.textContent;
    });
  });
});

const hamburgerMenu = document.getElementById('hamburger');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');

const messageDiv = document.getElementById('message');

hamburgerMenu.addEventListener('click', () => {
  sideMenu.classList.add('open');
  overlay.classList.add('show');
});

overlay.addEventListener('click', () => {
  sideMenu.classList.remove('open');
  overlay.classList.remove('show');
});
