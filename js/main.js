/* ============================================================================
   ARMORA — вся логика страницы.

   Без зависимостей и без сборки. Файл читается сверху вниз: меню, появление
   блоков, табы, калькулятор, форма.
   ============================================================================ */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ── Мобильное меню ─────────────────────────────────────────────────────── */

  (function menu() {
    var toggle = $('#navToggle');
    var links = $('#navLinks');
    if (!toggle || !links) return;

    var ICON_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

    function setOpen(open) {
      links.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      toggle.innerHTML = open ? ICON_CLOSE : ICON_OPEN;
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // Ссылка ведёт к якорю на этой же странице: меню должно закрыться само,
    // иначе оно перекроет то, к чему только что перешли.
    $$('a', links).forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  })();

  /* ── Появление блоков ───────────────────────────────────────────────────── */

  (function reveal() {
    var items = $$('.reveal');
    if (!items.length) return;

    // Если наблюдателя нет — просто показываем всё. Контент важнее анимации.
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });

    items.forEach(function (el) { io.observe(el); });

    // Страховка: если наблюдатель по какой-то причине не отдал ни одной
    // записи, через полторы секунды показываем всё принудительно. Контент
    // не имеет права остаться невидимым из-за сбоя в скрипте.
    setTimeout(function () {
      items.forEach(function (el) { el.classList.add('is-visible'); });
    }, 1600);
  })();

  /* ── Табы услуг ─────────────────────────────────────────────────────────── */

  (function tabs() {
    var list = $$('[role="tab"]');
    if (!list.length) return;

    function select(tab) {
      list.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
    }

    list.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });

      // Стрелки между вкладками — ожидаемое поведение для role="tablist".
      tab.addEventListener('keydown', function (e) {
        var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) return;
        var next = list[(i + dir + list.length) % list.length];
        next.focus();
        select(next);
        e.preventDefault();
      });
    });
  })();

  /* ── Калькулятор ────────────────────────────────────────────────────────── */

  (function calculator() {
    var box = $('#calcBox');
    if (!box) return;

    /**
     * Цены совпадают с прайсом в блоке «Комплексы» — это один и тот же
     * источник для посетителя, и расхождение сразу читалось бы как обман.
     * Классы: I — седан и хэтчбек, II — кроссовер, III — внедорожник.
     */
    var STEPS = [
      {
        question: 'Какой у вас автомобиль?',
        key: 'class',
        options: [
          { id: 'I', title: 'Седан или хэтчбек', note: 'I класс' },
          { id: 'II', title: 'Кроссовер', note: 'II класс' },
          { id: 'III', title: 'Внедорожник или минивэн', note: 'III класс' }
        ]
      },
      {
        question: 'Что оклеиваем?',
        key: 'package',
        options: [
          { id: 'risk', title: 'Зоны риска', note: 'Перёд частично: капот на треть, фары, бампер' },
          { id: 'standard', title: 'Стандарт', note: 'Весь перёд и уязвимые зоны по кузову' },
          { id: 'full', title: 'Полная защита', note: 'Кузов целиком под плёнкой' }
        ]
      },
      {
        question: 'Какую плёнку ставим?',
        key: 'film',
        options: [
          { id: 'clear', title: 'Прозрачный полиуретан', note: 'Цвет кузова не меняется' },
          { id: 'matte', title: 'Матовый полиуретан', note: 'Матовый эффект, +15% к цене' },
          { id: 'vinyl', title: 'Цветной винил', note: 'Смена цвета, дешевле полиуретана' }
        ]
      }
    ];

    var BASE = {
      risk: { I: 20000, II: 30000, III: 40000 },
      standard: { I: 80000, II: 90000, III: 100000 },
      full: { I: 210000, II: 230000, III: 250000 }
    };

    var FILM = { clear: 1, matte: 1.15, vinyl: 0.85 };
    var FILM_NAME = { clear: 'прозрачный полиуретан', matte: 'матовый полиуретан', vinyl: 'цветной винил' };
    var PACKAGE_NAME = { risk: 'зоны риска', standard: 'стандарт', full: 'полная защита' };
    var CLASS_NAME = { I: 'седан или хэтчбек', II: 'кроссовер', III: 'внедорожник или минивэн' };

    var answers = {};
    var step = 0;

    var elQuestion = $('#calcQuestion');
    var elOptions = $('#calcOptions');
    var elBar = $('#calcBar');
    var elLabel = $('#calcStepLabel');
    var elBack = $('#calcBack');
    var elNext = $('#calcNext');
    var elResult = $('#calcResult');
    var elTotal = $('#calcTotal');
    var elSummary = $('#calcSummary');

    var money = function (value) {
      return new Intl.NumberFormat('ru-RU').format(Math.round(value)) + ' ₽';
    };

    function render() {
      var current = STEPS[step];
      elQuestion.textContent = current.question;
      elLabel.textContent = 'Шаг ' + (step + 1) + ' из ' + STEPS.length;
      elBar.style.width = ((step + 1) / STEPS.length) * 100 + '%';

      elOptions.innerHTML = '';
      current.options.forEach(function (opt) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'calc-option';
        btn.setAttribute('aria-pressed', String(answers[current.key] === opt.id));
        btn.innerHTML = '<strong></strong><span></span>';
        btn.querySelector('strong').textContent = opt.title;
        btn.querySelector('span').textContent = opt.note;
        btn.addEventListener('click', function () {
          answers[current.key] = opt.id;
          render();
        });
        elOptions.appendChild(btn);
      });

      elBack.hidden = step === 0;
      elNext.disabled = !answers[current.key];
      elNext.textContent = step === STEPS.length - 1 ? 'Показать цену' : 'Далее';
    }

    function showResult() {
      var base = BASE[answers.package][answers.class];
      var total = base * FILM[answers.film];

      elResult.hidden = false;
      // Вилка, а не одно число: точная смета зависит от состояния кузова,
      // и обещать копейку в копейку до осмотра нечестно.
      elTotal.textContent = money(total * 0.95) + ' — ' + money(total * 1.12);
      elSummary.textContent =
        CLASS_NAME[answers.class] + ', ' + PACKAGE_NAME[answers.package] +
        ', ' + FILM_NAME[answers.film] + '. Точную сумму назовём после осмотра.';

      elResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    elNext.addEventListener('click', function () {
      if (step < STEPS.length - 1) {
        step++;
        render();
      } else {
        showResult();
      }
    });

    elBack.addEventListener('click', function () {
      if (step > 0) { step--; elResult.hidden = true; render(); }
    });

    $('#calcReset').addEventListener('click', function () {
      answers = {};
      step = 0;
      elResult.hidden = true;
      render();
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    render();
  })();

  /* ── Форма заявки ───────────────────────────────────────────────────────── */

  (function form() {
    var form = $('#leadForm');
    if (!form) return;

    var status = $('#formStatus');
    var openedAt = Date.now();

    // Маска телефона: держим только цифры и раскладываем по шаблону.
    // Так посетителю не приходится угадывать формат, а нам — разбирать
    // семь вариантов записи одного номера.
    var phone = form.elements.phone;
    phone.addEventListener('input', function () {
      var digits = phone.value.replace(/\D/g, '').replace(/^8/, '7').replace(/^([^7])/, '7$1').slice(0, 11);
      if (!digits) { phone.value = ''; return; }
      var out = '+7';
      if (digits.length > 1) out += ' (' + digits.slice(1, 4);
      if (digits.length >= 5) out += ') ' + digits.slice(4, 7);
      if (digits.length >= 8) out += '-' + digits.slice(7, 9);
      if (digits.length >= 10) out += '-' + digits.slice(9, 11);
      phone.value = out;
    });

    function setError(fieldId, message) {
      var field = document.getElementById(fieldId);
      field.classList.toggle('is-error', Boolean(message));
      var slot = field.querySelector('[data-error]');
      if (slot) slot.textContent = message || '';
      return !message;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.textContent = '';
      status.className = 'form-status';

      var ok = true;
      ok = setError('fieldName', form.elements.name.value.trim().length >= 2 ? '' : 'Напишите, как к вам обращаться') && ok;
      ok = setError('fieldPhone', phone.value.replace(/\D/g, '').length === 11 ? '' : 'Нужен телефон из 11 цифр') && ok;

      if (!form.elements.consent.checked) {
        status.textContent = 'Без согласия на обработку данных мы не можем принять заявку.';
        status.className = 'form-status is-error';
        ok = false;
      }

      if (!ok) return;

      /* Две тихие проверки против ботов. Обе отвечают «принято» и ничего не
         отправляют: бот, получивший отказ, подбирает обход, а бот,
         получивший спасибо, уходит довольным. */
      var trapped = form.elements.website.value !== '';
      var tooFast = Date.now() - openedAt < 2500;

      status.className = 'form-status is-ok';
      status.textContent = 'Заявка принята. Перезвоним в течение рабочего дня.';

      if (trapped || tooFast) return;

      // Здесь будет отправка на сервер. Пока бэкенда нет, форма честно
      // подтверждает приём и очищается — подключение займёт один запрос.
      form.reset();
      openedAt = Date.now();
    });
  })();

  /* ── Год в подвале ──────────────────────────────────────────────────────── */

  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
