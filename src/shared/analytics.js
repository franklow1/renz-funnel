/* =====================================================================
   THE PIXEL. One copy, shared by every page bundle, because the two ids
   below are the kind of thing that gets changed once and then quietly
   disagrees with itself in three other files.

   Browser side only. The Conversions API token never appears here: this
   file ships to GitHub Pages where anybody can read it, and a CAPI token
   can send events as the business that owns it. CAPI belongs server side.

   Every event carries an event_id. Nothing is sending server side events
   today, but the moment something does, Meta matches on that id and
   counts one conversion instead of two. Adding it now costs nothing and
   is impossible to retrofit onto conversions that have already happened.
   ===================================================================== */
(function(){
  var META = '1148480488092091';
  var GA4  = 'G-JL4LTGKXY2';

  /* An event that has already happened must never happen twice. The store
     matters: a thing that is true forever, like a man having bought order
     12345, outlives the tab he bought it in. A thing that is true for one
     visit does not. */
  function once(key, forever){
    try{
      var s = forever ? window.localStorage : window.sessionStorage;
      if (s.getItem(key)) return false;
      s.setItem(key, '1');
      return true;
    }catch(e){ return true; }   /* storage blocked: fire rather than go silent */
  }

  function rid(){
    try{
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    }catch(e){}
    return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2,10);
  }

  /* Meta's base snippet, written out rather than pasted, so it is readable. */
  try{
    if (!window.fbq){
      var n = window.fbq = function(){
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!window._fbq) window._fbq = n;
      n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      var fs = document.createElement('script');
      fs.async = true; fs.src = 'https://connect.facebook.net/en_US/fbevents.js';
      (document.head || document.documentElement).appendChild(fs);
    }
    window.fbq('init', META);
  }catch(e){}

  try{
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) window.gtag = function(){ window.dataLayer.push(arguments); };
    var gs = document.createElement('script');
    gs.async = true; gs.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4;
    (document.head || document.documentElement).appendChild(gs);
    window.gtag('js', new Date());
    window.gtag('config', GA4);
  }catch(e){}

  /* GA4 will not take Meta's names, so each one is said twice, once in each
     language. Anything without a GA4 equivalent goes through under its own
     name rather than being forced into a standard one it does not fit. */
  var GA_NAME = { Lead:'generate_lead', InitiateCheckout:'begin_checkout',
                  Purchase:'purchase', Schedule:'schedule', PageView:null };

  window.RZPX = {
    /* name   a Meta standard event
       params {value, currency, ...}
       opts   {id} the event id, and {key, forever} to make it fire only once */
    fire: function(name, params, opts){
      opts = opts || {};
      if (opts.key && !once(opts.key, !!opts.forever)) return false;
      var id = opts.id || rid();
      params = params || {};
      try{ window.fbq('track', name, params, {eventID: id}); }catch(e){}
      try{
        var g = GA_NAME[name];
        if (g){
          var p = {event_id: id};
          if (params.value != null) p.value = params.value;
          if (params.currency) p.currency = params.currency;
          window.gtag('event', g, p);
        }
      }catch(e){}
      return true;
    }
  };

  try{ window.fbq('track', 'PageView'); }catch(e){}
})();
