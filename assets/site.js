  // mobile nav
  var t=document.getElementById('navtoggle'), l=document.getElementById('navlinks');
  t&&t.addEventListener('click',function(){l.classList.toggle('open')});
  l&&l.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){l.classList.remove('open')})});

  // scroll reveal
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
  },{threshold:.14});
  document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});

  // A cross-page link can land mid-document (index.html#output), and anything the
  // browser jumped over never intersects, so it would stay hidden when you scroll
  // back up. Reveal whatever is already above the viewport once the page settles.
  addEventListener('load',function(){
    document.querySelectorAll('.reveal').forEach(function(el){
      if(el.getBoundingClientRect().bottom < 0){ el.classList.add('in'); io.unobserve(el); }
    });
  });

  // animate bars when they scroll into view
  document.querySelectorAll('.bars').forEach(function(group){
    var bo=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.isIntersecting){
          group.querySelectorAll('.bar-fill').forEach(function(f){ f.style.transform='scaleX('+(f.dataset.w/100)+')'; });
          bo.disconnect();
        }
      });
    },{threshold:.35});
    bo.observe(group);
  });
