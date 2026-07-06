/* ВКО Сервис — калькулятор стоимости уборки
   Базовые цены взяты из прайс-листа (prajs.html). Для услуг, где на сайте
   указана только цена "от" за минимальный заказ (уборка квартир, домов),
   расчёт сверх базовой площади — ориентировочный, помечен как таковой. */
(function(){

  var RATES = {
    kvartira: {
      label: 'Уборка квартир', baseArea: 40,
      types: [
        { id:'generalnaya',        name:'Генеральная уборка',            base:5000,  extra:110 },
        { id:'podderzhivayushaya', name:'Поддерживающая (экспресс)',     base:3500,  extra:70  },
        { id:'posle-pozhara',      name:'Уборка после пожара',           base:11000, extra:160 },
        { id:'raz-v-nedelu',       name:'Уборка раз в неделю',           base:3500,  extra:60  },
        { id:'odnokomnatnye',      name:'Однокомнатные квартиры',        base:3500,  extra:0   },
        { id:'srochnaya',          name:'Срочная уборка',                base:5000,  extra:110 },
        { id:'posle-remonta',      name:'Уборка после ремонта',          base:7500,  extra:140 }
      ]
    },
    dom: {
      label: 'Дом / коттедж', baseArea: 60,
      types: [
        { id:'generalnaya',        name:'Генеральная уборка',            base:8500,  extra:130 },
        { id:'podderzhivayushaya', name:'Поддерживающая уборка',         base:5000,  extra:100 },
        { id:'posle-remonta',      name:'После ремонта / стройки',       base:11000, extra:160 },
        { id:'razovaya',           name:'Разовая уборка',                base:6000,  extra:110 },
        { id:'pered-sdachey',      name:'Перед сдачей / переездом',      base:7500,  extra:120 }
      ]
    },
    ofis: {
      label: 'Уборка офисов',
      types: [
        { id:'generalnaya',   name:'Генеральная уборка', tiers:[[500,550],[1500,400],[Infinity,300]] },
        { id:'ezhednevnaya',  name:'Ежедневная уборка',  tiers:[[500,450],[1500,350],[Infinity,260]] },
        { id:'posle-remonta', name:'После ремонта',      tiers:[[500,350],[1500,300],[Infinity,200]] }
      ]
    },
    meropriyatie: {
      label: 'Уборка мероприятий',
      types: [
        { id:'v-pomeshenii', name:'Уборка в помещениях',       rate:27 },
        { id:'na-ulice',     name:'Уборка на улице',           rate:34 },
        { id:'kompleks',     name:'Комплексное обслуживание',  rate:40 },
        { id:'posle',        name:'После мероприятия',         rate:null }
      ]
    },
    divan: {
      label: 'Химчистка мебели',
      fabrics: ['Ткань', 'Велюр / кожа / бархат / алькантара / шёлк', 'Нубук / натуральная замша'],
      items: [
        { id:'divan2',    name:'2-местный диван',     prices:[2500,3700,6200]  },
        { id:'divan3',    name:'3-местный диван',     prices:[3500,5200,8700]  },
        { id:'divanugl',  name:'Угловой диван',       prices:[4000,5900,10000] },
        { id:'divan6',    name:'6-местный диван',     prices:[5300,8000,13500] },
        { id:'divan7',    name:'7-местный диван',     prices:[6000,9000,15000] },
        { id:'divan8',    name:'8-местный диван',     prices:[7000,10000,17200] },
        { id:'divanp',    name:'П-образный диван',    prices:[7000,10000,17200] },
        { id:'kreslobol', name:'Кресло большое',      prices:[1200,1750,3000]  },
        { id:'kreslomal', name:'Кресло маленькое',    prices:[800,1200,2000]   },
        { id:'stulsp',    name:'Стул со спинкой',     prices:[500,700,1200]    },
        { id:'stulbez',   name:'Стул без спинки',     prices:[300,400,870]     },
        { id:'pufik',     name:'Пуфик',               prices:[550,850,1500]    },
        { id:'mesto',     name:'Посадочное место',    prices:[600,850,1450]    }
      ]
    },
    kovry: { label:'Химчистка ковров', rate:240 },
    okna: {
      label: 'Мытьё окон',
      lines: [
        { id:'odnostvorch', name:'Одностворчатое окно', rate:250 },
        { id:'dvustvorch',  name:'Двустворчатое окно',   rate:350 },
        { id:'trehstvorch', name:'Трёхстворчатое окно',  rate:450 },
        { id:'nestandart',  name:'Нестандартные окна',   rate:500 },
        { id:'vitrazh',     name:'Витраж',               rate:450 },
        { id:'balkon',      name:'Балкон (створка)',     rate:250 },
        { id:'reshetki',    name:'Оконные решётки',      rate:230 },
        { id:'zhalyuzi',    name:'Жалюзи (створка)',     rate:250 },
        { id:'sayding',     name:'Сайдинг (балкон)',     rate:480 }
      ]
    },
    smert: { label:'Уборка после смерти' }
  };

  var ORDER = ['kvartira','dom','ofis','meropriyatie','divan','kovry','okna','smert'];

  var tabsWrap = document.getElementById('calcTabs');
  var bodyWrap = document.getElementById('calcBody');
  var resultValue = document.getElementById('calcTotal');
  var resultNote = document.getElementById('calcNote');
  if(!tabsWrap || !bodyWrap) return;

  function money(n){ return Math.round(n).toLocaleString('ru-RU'); }

  /* Reads a number field, clamps it to [min,max] and writes the clamped value
     back into the input so users can't submit negative, zero or absurd values
     even if they type past the min/max or use up/down arrows past the limit. */
  function readClamped(input, min, max, fallback){
    var v = parseFloat(input.value);
    if(isNaN(v)) v = fallback;
    v = Math.max(min, Math.min(max, v));
    if(String(v) !== input.value) input.value = v;
    return v;
  }

  function buildPanelHTML(key, cfg){
    if(key === 'kvartira' || key === 'dom'){
      var opts = cfg.types.map(function(t){
        return '<option value="'+t.id+'">'+t.name+' — от '+money(t.base)+' ₽</option>';
      }).join('');
      return '<div class="calc-grid">'
        + '<div class="calc-field"><label>Вид уборки</label><select data-role="type">'+opts+'</select></div>'
        + '<div class="calc-field"><label>Площадь, м²</label><input type="number" min="10" max="1000" step="5" value="'+cfg.baseArea+'" data-role="area">'
        + '<small>Базовая цена — до '+cfg.baseArea+' м², дальше стоимость растёт с площадью. Площадь: от 10 до 1000 м²</small></div>'
        + '</div>';
    }
    if(key === 'ofis'){
      var opts = cfg.types.map(function(t){ return '<option value="'+t.id+'">'+t.name+'</option>'; }).join('');
      return '<div class="calc-grid">'
        + '<div class="calc-field"><label>Вид уборки</label><select data-role="type">'+opts+'</select></div>'
        + '<div class="calc-field"><label>Площадь, м²</label><input type="number" min="10" max="20000" step="10" value="300" data-role="area"></div>'
        + '</div>';
    }
    if(key === 'meropriyatie'){
      var opts = cfg.types.map(function(t){
        return '<option value="'+t.id+'">'+t.name+(t.rate ? (' — от '+t.rate+' ₽/м²') : ' — договорная')+'</option>';
      }).join('');
      return '<div class="calc-grid">'
        + '<div class="calc-field"><label>Вид уборки</label><select data-role="type">'+opts+'</select></div>'
        + '<div class="calc-field"><label>Площадь, м²</label><input type="number" min="10" max="20000" step="10" value="200" data-role="area"></div>'
        + '</div>';
    }
    if(key === 'divan'){
      var itemOpts = cfg.items.map(function(it){ return '<option value="'+it.id+'">'+it.name+'</option>'; }).join('');
      var fabricOpts = cfg.fabrics.map(function(f, idx){ return '<option value="'+idx+'">'+f+'</option>'; }).join('');
      return '<div class="calc-grid">'
        + '<div class="calc-field"><label>Изделие</label><select data-role="item">'+itemOpts+'</select></div>'
        + '<div class="calc-field"><label>Материал обивки</label><select data-role="fabric">'+fabricOpts+'</select></div>'
        + '<div class="calc-field"><label>Количество</label><input type="number" min="1" max="50" step="1" value="1" data-role="qty"></div>'
        + '</div>';
    }
    if(key === 'kovry'){
      return '<div class="calc-grid">'
        + '<div class="calc-field"><label>Площадь ковров, м²</label><input type="number" min="1" max="1000" step="1" value="15" data-role="area">'
        + '<small>от '+cfg.rate+' ₽/м²</small></div>'
        + '</div>';
    }
    if(key === 'okna'){
      var lines = cfg.lines.map(function(l){
        return '<div class="calc-line"><div class="calc-line-name">'+l.name+'<small>от '+l.rate+' ₽</small></div>'
          + '<input type="number" min="0" max="200" step="1" value="0" data-role="line" data-rate="'+l.rate+'"></div>';
      }).join('');
      return '<div class="calc-lines">'+lines+'</div>';
    }
    if(key === 'smert'){
      return '<p style="color:var(--ink-soft); font-size:15px; line-height:1.7; max-width:640px">'
        + 'Стоимость уборки после смерти определяется индивидуально после осмотра объекта — цена зависит от площади, '
        + 'давности события и сложности санитарной обработки и дезинфекции. Оставьте заявку, и мы согласуем точную '
        + 'стоимость и удобное время выезда специалиста.</p>';
    }
    return '';
  }

  ORDER.forEach(function(key, i){
    var cfg = RATES[key];

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'calc-tab' + (i === 0 ? ' is-active' : '');
    btn.dataset.panel = key;
    btn.textContent = cfg.label;
    tabsWrap.appendChild(btn);

    var panel = document.createElement('div');
    panel.className = 'calc-panel' + (i === 0 ? ' is-active' : '');
    panel.dataset.panel = key;
    panel.innerHTML = buildPanelHTML(key, cfg);
    bodyWrap.appendChild(panel);
  });

  function calc(){
    var panel = bodyWrap.querySelector('.calc-panel.is-active');
    if(!panel) return;
    var key = panel.dataset.panel;
    var cfg = RATES[key];
    var total = 0;
    var dogovornaya = false;
    var note = 'Ориентировочный расчёт. Точную стоимость подтвердим после уточнения деталей по телефону.';

    if(key === 'kvartira' || key === 'dom'){
      var typeId = panel.querySelector('[data-role="type"]').value;
      var area = readClamped(panel.querySelector('[data-role="area"]'), 10, 1000, cfg.baseArea);
      var t = cfg.types.filter(function(x){ return x.id === typeId; })[0];
      total = t.base + Math.max(0, area - cfg.baseArea) * t.extra;
    } else if(key === 'ofis'){
      var typeId = panel.querySelector('[data-role="type"]').value;
      var area = readClamped(panel.querySelector('[data-role="area"]'), 10, 20000, 300);
      var t = cfg.types.filter(function(x){ return x.id === typeId; })[0];
      var tier = t.tiers.filter(function(tr){ return area <= tr[0]; })[0] || t.tiers[t.tiers.length - 1];
      total = area * tier[1];
      note = 'Расчёт по тарифу за м² согласно действующему прайс-листу.';
    } else if(key === 'meropriyatie'){
      var typeId = panel.querySelector('[data-role="type"]').value;
      var area = readClamped(panel.querySelector('[data-role="area"]'), 10, 20000, 200);
      var t = cfg.types.filter(function(x){ return x.id === typeId; })[0];
      if(t.rate == null){ dogovornaya = true; }
      else { total = area * t.rate; note = 'Расчёт по тарифу за м² согласно действующему прайс-листу.'; }
    } else if(key === 'divan'){
      var itemId = panel.querySelector('[data-role="item"]').value;
      var fabricIdx = parseInt(panel.querySelector('[data-role="fabric"]').value, 10);
      var qty = readClamped(panel.querySelector('[data-role="qty"]'), 1, 50, 1);
      var it = cfg.items.filter(function(x){ return x.id === itemId; })[0];
      total = it.prices[fabricIdx] * qty;
      note = 'Финальная стоимость уточняется после осмотра изделия и диагностики загрязнений.';
    } else if(key === 'kovry'){
      var area = readClamped(panel.querySelector('[data-role="area"]'), 1, 1000, 15);
      total = area * cfg.rate;
      note = 'Точная цена зависит от материала и степени загрязнения ковра.';
    } else if(key === 'okna'){
      var inputs = panel.querySelectorAll('[data-role="line"]');
      inputs.forEach(function(inp){
        var qty = readClamped(inp, 0, 200, 0);
        var rate = parseFloat(inp.getAttribute('data-rate')) || 0;
        total += qty * rate;
      });
      note = 'Точная цена зависит от количества и типа окон.';
    } else if(key === 'smert'){
      dogovornaya = true;
    }

    if(dogovornaya){
      resultValue.textContent = 'Договорная';
      resultNote.textContent = 'Стоимость определяется индивидуально после осмотра объекта. Оставьте заявку — рассчитаем точную цену.';
    } else {
      resultValue.textContent = 'от ' + money(total) + ' ₽';
      resultNote.textContent = note;
    }
  }

  tabsWrap.addEventListener('click', function(e){
    var btn = e.target.closest('.calc-tab');
    if(!btn) return;
    Array.prototype.forEach.call(tabsWrap.querySelectorAll('.calc-tab'), function(b){ b.classList.remove('is-active'); });
    btn.classList.add('is-active');
    var key = btn.dataset.panel;
    Array.prototype.forEach.call(bodyWrap.querySelectorAll('.calc-panel'), function(p){
      p.classList.toggle('is-active', p.dataset.panel === key);
    });
    calc();
  });

  bodyWrap.addEventListener('input', calc);
  bodyWrap.addEventListener('change', calc);

  calc();
})();
