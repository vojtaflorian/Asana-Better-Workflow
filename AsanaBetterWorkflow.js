// ==UserScript==
// @name Asana better workflow
// @namespace http://example.com
// @version 0.4
// @updateURL https://raw.githubusercontent.com/vojtaflorian/TamperMonkey-scripts/main/AsanaBetterWorkflow.js
// @downloadURL https://raw.githubusercontent.com/vojtaflorian/TamperMonkey-scripts/main/AsanaBetterWorkflow.js
// @description This userscript enhances the Asana workflow by adjusting task pane widths, hiding unnecessary elements, and displaying the number of days until a task’s due date. It also includes a button to toggle the visibility of completed subtasks.
// @author Vojta Florian
// @homepage https://vojtaflorian.com
// @match https://app.asana.com/*


// @grant none
// ==/UserScript==

(function() {
    'use strict';

/*ÚPRAVA STYLU, ODEBRÁNÍ ZBYTEČNOSTÍ A ŠÍŘKA ÚKOLU NA MALÉM OKNĚ*/
    addGlobalStyle(`
.InboxPanesOrEmptyState-detailsPane:not(.InboxPanesOrEmptyState-pane--windowed) {
     width: 80% !important;
}


.FullWidthPageStructureWithDetailsOverlay-detailsOverlay--fullHeightTaskPane {
   width: 65% !important;
   min-width: 50% !important;
}

.Sidebar-changeInviteIconEnabled {
     display: none !important;
}

.Sidebar-cleanAndClearInviteAndHelpSection {
     display: none !important;
}

.BusinessOrAdvancedUpgradeButton {
     display: none !important;
}

.GlobalTopbar-upgradeButton {
     display: none !important;
}
/*odebírá placené funkce*/
.PremiumIconItemA11y {
     display: none !important;
}


.CustomPropertyEnumValueInput-button.CustomPropertyEnumValueInput-button--large {
     max-width: 100px !important;
     padding: 5px !important;
}
.SpreadsheetCell--isCompact.SpreadsheetCell,
.SpreadsheetCell--isCompact.SpreadsheetCell.SpreadsheetCustomPropertyEnumCell-spreadsheetCell,
.SpreadsheetCell--isCompact.SpreadsheetCell.SpreadsheetAssigneeCell-cell.SpreadsheetTaskRow-assigneeCell,
.SpreadsheetCell--isCompact.SpreadsheetCell.SpreadsheetCustomPropertyNumberCell-spreadsheetCell,
.SpreadsheetHeaderColumn--fixedWidth.SpreadsheetHeaderColumn--isClickable.SpreadsheetHeaderColumn.SpreadsheetProjectHeaderRow-headerColumn {
    width: 80px !important;
}

`);

    function addGlobalStyle(css) {
        var head, style;
        head = document.getElementsByTagName('head')[0];
        if (!head) { return; }
        style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    }

/*PŘIDÁNÍ POČTU DNŮ K DATUMU ÚKOLU*/

 // Funkce pro převod textu na datum
var str2date = (s) => {
    var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (s === 'Today') { return new Date(); }
    if (s === 'Tomorrow') { return new Date((new Date()).getTime() + 24 * 60 * 60 * 1000); }
    if (days.indexOf(s) > -1) {
        var date = new Date();
        for (var i = 1; i < 7; i++) {
            date = new Date((new Date()).getTime() + i * 24 * 60 * 60 * 1000);
            if (date.getDay() === days.indexOf(s) + 1) { // +1 protože getDay vrací index od neděle
                return date;
            }
        }
    }
    return new Date(s.includes(',') ? s : s + ',' + (new Date()).getFullYear());
};

// Funkce pro aktualizaci due date polí
function updateDueDates() {
    const dueDates = document.querySelectorAll('div.DueDate');
    dueDates.forEach(duedate => {
        if (duedate && !duedate.innerText.includes('(')) {
            var date_today = new Date();
            var date_due = str2date(duedate.innerText);
            var days_left = (date_due - date_today) / (1000 * 60 * 60 * 24);
            if (days_left > 0) {
                duedate.innerText = duedate.innerText + ' (' + Math.ceil(days_left) + ' days)';
            }
        }
    });
}

// Inicializace při načtení stránky
document.addEventListener('DOMContentLoaded', () => {
    updateDueDates();
});

// Nastavení MutationObserver pro sledování změn v DOM
const mobs = new MutationObserver((mutations) => {
    mutations.forEach(() => {
        updateDueDates();
    });
});

mobs.observe(document.body, {
    subtree: true,
    childList: true,
});
/*AUTOCLICK NA NAČTENÍ VŠECH SUBTASKS A CELÝCH KOMENTÁŘŮ*/
/*TLAČÍTKO PRO SKRÝVÁNÍ HOTOVÝCH ÚKOLŮ*/
// Funkce pro vytvoření tlačítka
function createToggleButton() {
  // Zkontrolovat, zda tlačítko již existuje
  if (document.querySelector('#toggleCompletedSubtasksButton')) return;

  const button = document.createElement('button');
  button.id = 'toggleCompletedSubtasksButton';
  button.innerText = 'Toggle Completed Subtasks';
  button.style.marginLeft = '10px';
/*  button.style.padding = '5px 10px';*/
  button.style.cursor = 'pointer';
  button.classList.add('ThemeableRectangularButtonPresentation', 'ThemeableRectangularButtonPresentation--medium', 'TopbarContingentUpgradeButton-button', 'UpsellButton');

  // Přidání funkce pro zapínání a vypínání stylu
  button.addEventListener('click', () => {
    const completedSubtasks = document.querySelectorAll('.SubtaskTaskRow--completed');
    const currentState = localStorage.getItem('completedSubtasksHidden') === 'true';
    completedSubtasks.forEach(subtask => {
      if (currentState) {
        subtask.style.display = '';
      } else {
        subtask.style.display = 'none';
      }
    });
    localStorage.setItem('completedSubtasksHidden', !currentState);
  });

  // Přidání tlačítka do divu
  const topbarRightSide = document.querySelector('.GlobalTopbarStructure-rightSide');
  if (topbarRightSide) {
    topbarRightSide.appendChild(button);
  }
}

// Funkce pro aplikování stavu tlačítka při načtení stránky
function applySavedState() {
  const currentState = localStorage.getItem('completedSubtasksHidden') === 'true';
  const completedSubtasks = document.querySelectorAll('.SubtaskTaskRow--completed');
  completedSubtasks.forEach(subtask => {
    if (currentState) {
      subtask.style.display = 'none';
    } else {
      subtask.style.display = '';
    }
  });
}

// Funkce pro kliknutí na tlačítka
function clickButtons() {
  let links = document.querySelectorAll('.SubtaskGrid-loadMore, .TruncatedRichText-expand');
  Array.from(links).forEach(link => {
    link.click();
  });
}

// Inicializace kliknutí při načtení stránky a vytvoření tlačítka
document.addEventListener('DOMContentLoaded', () => {
  clickButtons();
  createToggleButton();
  applySavedState(); // Aplikování uloženého stavu
});

// Nastavení MutationObserver pro sledování změn v DOM
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      clickButtons();
      createToggleButton();
      applySavedState(); // Aplikování uloženého stavu při změně DOM
    }
  });
});

// Nastavení observeru na root element stránky
observer.observe(document.body, {
  childList: true,
  subtree: true
});


})();
