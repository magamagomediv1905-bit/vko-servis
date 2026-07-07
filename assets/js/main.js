/* ВКО Сервис — общая логика сайта */
document.addEventListener('DOMContentLoaded', function () {

  /* ---------- Header scroll state ---------- */
  var header = document.querySelector('.site-header');
  function onScroll(){
    if(!header) return;
    if(window.scrollY > 30) header.classList.add('is-scrolled');
    else header.classList.remove('is-scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive:true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  var burger = document.querySelector('.burger');
  var mobileNav = document.querySelector('.mobile-nav');
  var mobileClose = document.querySelector('.mobile-close');
  function toggleMobile(open){
    if(!mobileNav) return;
    mobileNav.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if(burger) burger.addEventListener('click', function(){ toggleMobile(true); });
  if(mobileClose) mobileClose.addEventListener('click', function(){ toggleMobile(false); });
  document.querySelectorAll('.mobile-nav a').forEach(function(a){
    a.addEventListener('click', function(){ toggleMobile(false); });
  });

  /* ---------- Mobile nav accordion groups ---------- */
  document.querySelectorAll('.mnav-toggle').forEach(function(btn){
    btn.addEventListener('click', function(){
      var group = btn.closest('.mnav-group');
      if(!group) return;
      var willOpen = !group.classList.contains('is-open');
      document.querySelectorAll('.mnav-group.is-open').forEach(function(g){
        if(g !== group){
          g.classList.remove('is-open');
          var t = g.querySelector('.mnav-toggle');
          if(t) t.setAttribute('aria-expanded', 'false');
        }
      });
      group.classList.toggle('is-open', willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    });
  });

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold:.15, rootMargin:'0px 0px -60px 0px' });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('is-visible'); });
  }

  /* ---------- Step-by-step decor (Tilda-style sbs) ---------- */
  var sbsBlocks = document.querySelectorAll('[data-sbs]');
  if(sbsBlocks.length && 'IntersectionObserver' in window){
    var sbsIo = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('sbs-play');
          sbsIo.unobserve(entry.target);
        }
      });
    }, { threshold:.25 });
    sbsBlocks.forEach(function(el){ sbsIo.observe(el); });
  } else {
    sbsBlocks.forEach(function(el){ el.classList.add('sbs-play'); });
  }

  /* ---------- Scroll-scrub decor (reversible, follows scroll) ---------- */
  var scrubItems = [];
  document.querySelectorAll('[data-scrub]').forEach(function(el){
    try{
      var steps = JSON.parse(el.getAttribute('data-scrub'));
      if(steps.length < 2) return;
      scrubItems.push({
        el: el,
        steps: steps,
        section: el.closest('.sbs-anchor') || el.parentElement,
        cur: 0, target: 0
      });
    }catch(e){}
  });
  if(scrubItems.length){
    var lerp = function(a,b,t){ return a + (b - a) * t; };
    var sample = function(steps, p, w){
      var seg = p * (steps.length - 1);
      var i = Math.min(Math.floor(seg), steps.length - 2);
      var t = seg - i, a = steps[i], b = steps[i+1];
      /* xp = horizontal offset as % of section width (adapts to any screen) */
      var ax = a.xp != null ? a.xp / 100 * w : (a.x || 0);
      var bx = b.xp != null ? b.xp / 100 * w : (b.x || 0);
      return {
        x: lerp(ax, bx, t),
        y: lerp(a.y||0, b.y||0, t),
        r: lerp(a.r||0, b.r||0, t),
        s: lerp(a.s!=null?a.s:1, b.s!=null?b.s:1, t),
        o: lerp(a.o!=null?a.o:1, b.o!=null?b.o:1, t)
      };
    };
    var scrubMeasure = function(){
      var vh = window.innerHeight;
      scrubItems.forEach(function(it){
        var rect = it.section.getBoundingClientRect();
        it.w = rect.width;
        /* 0 = section entering from below, 1 = section leaving above */
        var p = (vh - rect.top) / (rect.height + vh);
        it.target = Math.max(0, Math.min(1, p));
      });
    };
    var scrubRender = function(){
      scrubItems.forEach(function(it){
        it.cur += (it.target - it.cur) * .14; /* easing so movement feels fluid */
        var s = sample(it.steps, it.cur, it.w || 0);
        it.el.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px) rotate(' + s.r.toFixed(1) + 'deg) scale(' + s.s.toFixed(3) + ')';
        it.el.style.opacity = s.o.toFixed(3);
      });
      requestAnimationFrame(scrubRender);
    };
    window.addEventListener('scroll', scrubMeasure, { passive:true });
    window.addEventListener('resize', scrubMeasure);
    scrubMeasure();
    requestAnimationFrame(scrubRender);
  }

  /* ---------- Squeegee scroll companion (flies from the logo, points at key sections) ---------- */
  var wiperEl = document.querySelector('.wiper');
  if(wiperEl && window.matchMedia('(min-width:901px)').matches){
    var trailEls = Array.prototype.slice.call(document.querySelectorAll('.wiper-trail'));
    var trailState = trailEls.map(function(){ return { x:0, y:0, init:false }; });
    var wStops = [], wSpots = [], wTotal = 1, wCur = 0, wPrevX = null, wShown = false, wOp = 0, wEnd = null;

    var wiperBuild = function(){
      var vw = window.innerWidth, vh = window.innerHeight;
      wTotal = Math.max(1, document.documentElement.scrollHeight - vh);
      var pts = [];
      var clampP = function(p){ return Math.min(.985, Math.max(.02, p)); };
      /* start point: right next to the logo */
      var logo = document.querySelector('.site-header .brand img');
      var logoPt = { x:150, y:52 };
      if(logo){
        var lr = logo.getBoundingClientRect();
        logoPt = { x: lr.left + lr.width / 2, y: lr.top + lr.height / 2 };
      }
      pts.push({ p:0, x: logoPt.x + 66, y: logoPt.y + 6, r:-20, s:.5 });
      /* waypoints: sections marked with data-wiper-stop (x/y in % of viewport);
         an array of points = a gesture spread across the section (sweep, polish loop) */
      document.querySelectorAll('[data-wiper-stop]').forEach(function(el){
        var c;
        try{ c = JSON.parse(el.getAttribute('data-wiper-stop')); }catch(e){ return; }
        var list = Array.isArray(c) ? c : [c];
        var rect = el.getBoundingClientRect();
        var top = rect.top + window.scrollY;
        var span = Math.min(rect.height * .7, vh * 1.1);
        list.forEach(function(cc, i){
          var off = list.length > 1 ? (i / (list.length - 1)) * span : 0;
          pts.push({
            p: clampP((top + off - vh * .5) / wTotal),
            x: (cc.x != null ? cc.x : 50) / 100 * vw,
            y: (cc.y != null ? cc.y : 40) / 100 * vh,
            r: cc.r || 0,
            s: 1
          });
        });
      });
      /* wipe scenes: .wiper-spot — the squeegee scrubs over the smudge in zigzag strokes,
         dirt fades under it, shine pops after */
      wSpots = [];
      document.querySelectorAll('.wiper-spot').forEach(function(el){
        var r = el.getBoundingClientRect();
        var docTop = r.top + window.scrollY;
        var pMid = clampP((docTop + r.height / 2 - vh * .5) / wTotal);
        var cx = r.left + r.width / 2;
        var cy = vh * .5;
        var w = Math.max(64, r.width * .75);
        pts.push({ p: clampP(pMid - .020), x: cx - w, y: cy - 40, r:-18, s:1 });
        pts.push({ p: clampP(pMid - .012), x: cx + w, y: cy - 14, r:16,  s:1 });
        pts.push({ p: clampP(pMid - .004), x: cx - w, y: cy + 10, r:-16, s:1 });
        pts.push({ p: clampP(pMid + .004), x: cx + w * .6, y: cy + 32, r:10, s:1 });
        wSpots.push({
          dirt: el.querySelector('.spot-dirt'),
          shine: el.querySelector('.spot-shine'),
          pMid: pMid
        });
      });
      /* finish: fly back and dock into the logo at the [data-wiper-end] section,
         otherwise land near the footer */
      var endEl = document.querySelector('[data-wiper-end]');
      if(endEl){
        var eTop = endEl.getBoundingClientRect().top + window.scrollY;
        wEnd = Math.min(.985, Math.max(.05, (eTop - vh * .55) / wTotal));
        pts.push({ p: Math.max(.03, wEnd - .035), x: vw * .45, y: vh * .22, r:-24, s:.8 });
        pts.push({ p: wEnd, x: logoPt.x, y: logoPt.y, r:0, s:.22 });
      } else {
        wEnd = null;
        pts.push({ p:1, x: vw * .5, y: vh * .7, r:0, s:1 });
      }
      pts.sort(function(a,b){ return a.p - b.p; });
      wStops = pts;
    };

    /* Catmull-Rom — smooth curved trajectory through all waypoints */
    var crv = function(v0,v1,v2,v3,t){
      return .5*((2*v1) + (-v0+v2)*t + (2*v0-5*v1+4*v2-v3)*t*t + (-v0+3*v1-3*v2+v3)*t*t*t);
    };
    var wiperSample = function(p){
      var pts = wStops;
      if(p <= pts[0].p) return pts[0];
      var last = pts[pts.length-1];
      if(p >= last.p) return last;
      var i = 0;
      while(i < pts.length - 2 && p > pts[i+1].p) i++;
      var a = pts[i], b = pts[i+1];
      var t = (p - a.p) / (b.p - a.p);
      var p0 = pts[Math.max(0, i-1)], p3 = pts[Math.min(pts.length-1, i+2)];
      return {
        x: crv(p0.x, a.x, b.x, p3.x, t),
        y: crv(p0.y, a.y, b.y, p3.y, t),
        r: a.r + (b.r - a.r) * t,
        s: a.s + (b.s - a.s) * t
      };
    };

    var wiperRender = function(ts){
      var target = Math.max(0, Math.min(1, window.scrollY / wTotal));
      wCur += (target - wCur) * .07;
      var s = wiperSample(wCur);
      /* gentle floating so it feels alive even at rest */
      var x = s.x + Math.sin(ts / 950) * 7;
      var y = s.y + Math.cos(ts / 780) * 5;
      /* banks into turns depending on horizontal speed */
      var tilt = 0;
      if(wPrevX != null) tilt = Math.max(-16, Math.min(16, (x - wPrevX) * 1.1));
      wPrevX = x;
      wiperEl.style.transform = 'translate(' + (x - 44).toFixed(1) + 'px,' + (y - 48).toFixed(1) + 'px) rotate(' + (s.r + tilt).toFixed(1) + 'deg) scale(' + s.s.toFixed(3) + ')';
      /* ghost mode over the content column so it never blocks reading;
         fully visible on page margins and during wipe scenes */
      var vw2 = window.innerWidth / 2;
      var contentHalf = Math.min(1240, window.innerWidth) / 2;
      var d = Math.abs(x - vw2);
      var zoneT = Math.max(0, Math.min(1, (d - (contentHalf - 120)) / 160));
      var targetOp = .2 + .8 * zoneT;
      /* stay visible while actively scrubbing a dirt spot */
      for(var si = 0; si < wSpots.length; si++){
        if(Math.abs(wCur - wSpots[si].pMid) < .028){ targetOp = Math.max(targetOp, .95); break; }
      }
      if(!wShown){ wiperEl.style.opacity = targetOp; wShown = true; }
      wOp += (targetOp - wOp) * .1;
      wiperEl.style.opacity = wOp.toFixed(3);
      /* sparkle trail — appears only while flying */
      var speed = Math.abs(target - wCur);
      trailEls.forEach(function(tr, idx){
        var st = trailState[idx];
        if(!st.init){ st.x = x; st.y = y; st.init = true; }
        var k = idx === 0 ? .05 : .032;
        st.x += (x - st.x) * k;
        st.y += (y - st.y) * k;
        tr.style.transform = 'translate(' + (st.x - 8).toFixed(1) + 'px,' + (st.y - 30).toFixed(1) + 'px)';
        tr.style.opacity = Math.min(.9, speed * 26).toFixed(3);
      });
      /* wipe scenes: dirt disappears while the squeegee scrubs it, then the shine pops */
      wSpots.forEach(function(sp){
        var q = Math.max(0, Math.min(1, (wCur - (sp.pMid - .022)) / .026));
        if(sp.dirt) sp.dirt.style.opacity = (1 - q).toFixed(3);
        var g = Math.max(0, Math.min(1, (wCur - sp.pMid) / .02));
        if(sp.shine){
          sp.shine.style.opacity = g.toFixed(3);
          sp.shine.style.transform = 'scale(' + (.4 + .8 * g).toFixed(3) + ') rotate(' + (g * 90).toFixed(1) + 'deg)';
        }
      });
      requestAnimationFrame(wiperRender);
    };

    wiperBuild();
    window.addEventListener('resize', wiperBuild);
    window.addEventListener('load', wiperBuild);
    requestAnimationFrame(wiperRender);
  }

  /* ---------- Animated counters ---------- */
  var counters = document.querySelectorAll('[data-counter]');
  function animateCounter(el){
    var target = parseFloat(el.getAttribute('data-counter'));
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1600;
    var start = null;
    function step(ts){
      if(!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.floor(eased * target);
      el.textContent = value.toLocaleString('ru-RU') + suffix;
      if(progress < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString('ru-RU') + suffix;
    }
    requestAnimationFrame(step);
  }
  if(counters.length && 'IntersectionObserver' in window){
    var counterIo = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          animateCounter(entry.target);
          counterIo.unobserve(entry.target);
        }
      });
    }, { threshold:.4 });
    counters.forEach(function(el){ counterIo.observe(el); });
  }

  /* ---------- Before / After — continuous looping sweep (no manual drag) ---------- */
  document.querySelectorAll('.baf').forEach(function(baf){
    var before = baf.querySelector('.baf-before');
    var handle = baf.querySelector('.baf-handle');
    var rafId = null;
    var isRunning = false;

    function setPos(pct){
      before.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
      if(handle) handle.style.left = pct + '%';
    }

    /* Sweep endpoints */
    var minPos = 10;
    var maxPos = 78;
    var holdMs = 900;      /* pause at each end before reversing */
    var sweepMs = 2600;    /* duration of one sweep between ends */
    setPos(minPos);

    function loop(){
      var direction = 1; /* 1 = growing toward maxPos, -1 = shrinking toward minPos */
      var pos = minPos;

      function sweep(){
        var start = null;
        var from = pos;
        var to = direction === 1 ? maxPos : minPos;
        function step(ts){
          if(!isRunning) return;
          if(!start) start = ts;
          var progress = Math.min((ts - start) / sweepMs, 1);
          var eased = progress < .5 ? 2*progress*progress : 1 - Math.pow(-2*progress+2,2)/2; /* ease-in-out */
          pos = from + (to - from) * eased;
          setPos(pos);
          if(progress < 1){
            rafId = requestAnimationFrame(step);
          } else {
            direction *= -1;
            setTimeout(function(){ if(isRunning) sweep(); }, holdMs);
          }
        }
        rafId = requestAnimationFrame(step);
      }
      sweep();
    }

    function start(){
      if(isRunning) return;
      isRunning = true;
      loop();
    }
    function stop(){
      isRunning = false;
      if(rafId) cancelAnimationFrame(rafId);
    }

    if('IntersectionObserver' in window){
      var bafIo = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting) start();
          else stop();
        });
      }, { threshold:.35 });
      bafIo.observe(baf);
    } else {
      start();
    }
  });

  /* ---------- Services carousel ---------- */
  document.querySelectorAll('[data-carousel]').forEach(function(carousel){
    var track = carousel.querySelector('[data-carousel-track]');
    var prev = carousel.querySelector('[data-carousel-prev]');
    var next = carousel.querySelector('[data-carousel-next]');
    if(!track) return;
    function cardStep(){
      var card = track.querySelector('.svc-card');
      if(!card) return track.clientWidth;
      var style = window.getComputedStyle(track);
      var gap = parseFloat(style.columnGap || style.gap || 24);
      return card.getBoundingClientRect().width + gap;
    }
    function updateArrows(){
      if(!prev || !next) return;
      var max = track.scrollWidth - track.clientWidth - 4;
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft >= max;
    }
    if(prev) prev.addEventListener('click', function(){ track.scrollBy({ left: -cardStep(), behavior:'smooth' }); });
    if(next) next.addEventListener('click', function(){ track.scrollBy({ left: cardStep(), behavior:'smooth' }); });
    track.addEventListener('scroll', updateArrows, { passive:true });
    window.addEventListener('resize', updateArrows);
    updateArrows();
  });

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(function(item){
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    q.addEventListener('click', function(){
      var isOpen = item.classList.contains('is-open');
      item.parentElement.querySelectorAll('.faq-item').forEach(function(other){
        other.classList.remove('is-open');
        other.querySelector('.faq-a').style.maxHeight = null;
      });
      if(!isOpen){
        item.classList.add('is-open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });

  /* ---------- Room tabs (checklist by room) ---------- */
  document.querySelectorAll('.room-tabs').forEach(function(tabs){
    var buttons = tabs.querySelectorAll('.room-tab');
    var panelsWrap = tabs.nextElementSibling;
    buttons.forEach(function(btn){
      btn.addEventListener('click', function(){
        var target = btn.getAttribute('data-room');
        buttons.forEach(function(b){ b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        panelsWrap.querySelectorAll('.room-panel').forEach(function(p){
          p.classList.toggle('is-active', p.getAttribute('data-room') === target);
        });
      });
    });
  });

  /* ---------- Popup order form ---------- */
  var overlay = document.querySelector('.popup-overlay');
  function matchServiceCategory(name){
    var n = name.toLowerCase();
    if(n.indexOf('окно') > -1 || n.indexOf('окон') > -1 || n.indexOf('витраж') > -1 || n.indexOf('жалюзи') > -1 || n.indexOf('сайдинг') > -1 || n.indexOf('решётк') > -1 || n.indexOf('балкон') > -1) return 'Мытьё окон';
    if(n.indexOf('офис') > -1) return 'Уборка офиса';
    if(n.indexOf('диван') > -1 || n.indexOf('ковр') > -1 || n.indexOf('матрас') > -1 || n.indexOf('кресл') > -1 || n.indexOf('мебел') > -1) return 'Химчистка мебели / ковров';
    if(n.indexOf('дом') > -1 || n.indexOf('коттедж') > -1) return 'Уборка дома / коттеджа';
    if(n.indexOf('квартир') > -1 || n.indexOf('комн') > -1) return 'Уборка квартиры';
    return null;
  }
  function openPopup(serviceName){
    if(!overlay) return;
    var tag = overlay.querySelector('.popup-service-tag');
    if(tag){
      if(serviceName){
        tag.hidden = false;
        var span = tag.querySelector('span');
        if(span) span.textContent = serviceName;
      } else {
        tag.hidden = true;
      }
    }
    var select = overlay.querySelector('.popup-card form select');
    if(select && serviceName){
      select.value = matchServiceCategory(serviceName) || 'Другое';
    }
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closePopup(){
    if(!overlay) return;
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  document.querySelectorAll('[data-open-popup]').forEach(function(btn){
    btn.addEventListener('click', function(e){ e.preventDefault(); openPopup(btn.getAttribute('data-service') || null); });
  });
  /* Clicking a price row opens the order form with that service pre-filled */
  document.querySelectorAll('.price-table tr').forEach(function(row){
    if(row.querySelector('th')) return;
    row.addEventListener('click', function(){
      var nameCell = row.querySelector('td:first-child');
      var serviceName = nameCell ? nameCell.textContent.trim() : '';
      openPopup(serviceName);
    });
  });
  document.querySelectorAll('[data-close-popup]').forEach(function(btn){
    btn.addEventListener('click', closePopup);
  });
  if(overlay){
    overlay.addEventListener('click', function(e){ if(e.target === overlay) closePopup(); });
  }
  /* ---------- Telegram notification (parallel to Formspree email) ---------- */
  var TELEGRAM_BOT_TOKEN = '8533988784:AAGmMWNz_N4suXnoDJFOFRCTlVBLTXN7UY0';
  var TELEGRAM_CHAT_ID = '-1003714665032';
  function escapeHtml(str){
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function sendToTelegram(formData){
    var fields = {};
    formData.forEach(function(value, key){ if(value) fields[key] = value; });
    var lines = ['<b>Новая заявка — ВКО Сервис</b>'];
    if(fields.name) lines.push('Имя: ' + escapeHtml(fields.name));
    if(fields.phone) lines.push('Телефон: ' + escapeHtml(fields.phone));
    if(fields.service) lines.push('Услуга: ' + escapeHtml(fields.service));
    if(fields.message) lines.push('Сообщение: ' + escapeHtml(fields.message));
    Object.keys(fields).forEach(function(key){
      if(['name','phone','service','message','_subject'].indexOf(key) === -1){
        lines.push(escapeHtml(key) + ': ' + escapeHtml(fields[key]));
      }
    });
    lines.push('Страница: ' + escapeHtml(location.href));
    return fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: lines.join('\n'), parse_mode: 'HTML' })
    }).catch(function(){ /* email fallback still works even if Telegram fails */ });
  }

  document.querySelectorAll('.popup-card form').forEach(function(popupForm){
    popupForm.addEventListener('submit', function(e){
      e.preventDefault();
      var btn = popupForm.querySelector('button[type=submit]');
      var original = btn.textContent;
      var action = popupForm.getAttribute('action') || '';

      if(!action || action.indexOf('YOUR_FORM_ID') > -1){
        btn.textContent = 'Форма ещё не настроена';
        setTimeout(function(){ btn.textContent = original; }, 2200);
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Отправляем…';

      var formData = new FormData(popupForm);
      sendToTelegram(formData);

      fetch(action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      }).then(function(response){
        if(response.ok){
          btn.textContent = 'Заявка отправлена!';
          setTimeout(function(){
            btn.textContent = original;
            btn.disabled = false;
            closePopup();
            popupForm.reset();
          }, 1800);
        } else {
          throw new Error('Request failed');
        }
      }).catch(function(){
        btn.textContent = 'Ошибка. Позвоните нам';
        btn.disabled = false;
        setTimeout(function(){ btn.textContent = original; }, 2500);
      });
    });
  });

  /* ---------- Smooth active nav dropdown a11y close on outside click ---------- */
  document.addEventListener('click', function(e){
    if(overlay && overlay.classList.contains('is-open') && !e.target.closest('.popup-card') && e.target === overlay){
      closePopup();
    }
  });
});
