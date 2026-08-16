import andreyDaylightConfidentV4 from '../assets/modernisto/andrey-daylight-confident-v4.avif?inline';
import andreyBrightV2 from '../assets/modernisto/andrey-bright-v2.avif?inline';
import andreyWarmV3 from '../assets/modernisto/andrey-warm-v3.avif?inline';

export const MODERNISTO_FORMAT_ONE_VISUAL_VARIANTS = Object.freeze([
  Object.freeze({
    id: 'midnight-blue',
    label: 'Яркий дневной',
    heroDataUri: andreyDaylightConfidentV4
  }),
  Object.freeze({
    id: 'daylight-blue',
    label: 'Светлый интерьер',
    heroDataUri: andreyBrightV2
  }),
  Object.freeze({
    id: 'warm-studio',
    label: 'Тёплая студия',
    heroDataUri: andreyWarmV3
  })
]);

export const MODERNISTO_FORMAT_ONE_GOAL_ICON_HTML = '<i class="a30l-goal-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" focusable="false"><path d="M7 17 17 7M9 7h8v8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></i>';

export const MODERNISTO_FORMAT_ONE_VISUAL_CSS = `<style id="a30l-approved-visual-variants">
html,body,#allrecords{max-width:100%;overflow-x:hidden}
#atmosfera-30-landing{--a30l-photo-x:58%;--a30l-photo-y:3%;--a30l-photo-mobile-x:56%;--a30l-photo-mobile-y:4%;--a30l-photo-filter:saturate(1.02) contrast(1.02) brightness(.99);max-width:100vw;overflow-x:clip}
#atmosfera-30-landing .a30l-goals .a30l-goal-icon{color:var(--a30l-acid);background:#229ed914;border:1px solid #229ed980;border-radius:50%;display:grid;place-items:center;flex:0 0 28px;width:28px;height:28px;font-size:16px;font-style:normal;position:relative;overflow:hidden}
#atmosfera-30-landing .a30l-goals .a30l-goal-icon svg{display:block;width:15px;height:15px}
#atmosfera-30-landing .a30l-goals .a30l-goal-icon:before,#atmosfera-30-landing .a30l-goals .a30l-goal-icon:after{content:none;display:none}
#atmosfera-30-landing .a30l-photo-frame{background:var(--a30l-bg-soft)}
#atmosfera-30-landing .a30l-photo-frame img{object-position:var(--a30l-photo-x) var(--a30l-photo-y);filter:var(--a30l-photo-filter)}
#atmosfera-30-landing[data-a30l-variant="midnight-blue"]{--a30l-bg:#0b1317;--a30l-bg-soft:#15232a;--a30l-muted:#c6ced1;--a30l-line:#ffffff30}
#atmosfera-30-landing[data-a30l-variant="midnight-blue"] .a30l-hero{background:radial-gradient(50% 70% at 78% 8%,#5ac5ef31,#0000 67%),radial-gradient(48% 48% at 50% 110%,#7197aa24,#0000 72%),linear-gradient(120deg,#0b1317 0%,#101b20 49%,#1c2a31 100%)}
#atmosfera-30-landing[data-a30l-variant="midnight-blue"] .a30l-visual:before{background:linear-gradient(90deg,var(--a30l-bg) 0%,#0b1317e8 12%,#0b1317a0 40%,transparent 65%),linear-gradient(0deg,var(--a30l-bg) 0%,#0b131788 13%,transparent 40%),linear-gradient(180deg,#0b131756,transparent 27%)}
#atmosfera-30-landing[data-a30l-variant="daylight-blue"]{--a30l-bg:#0d1416;--a30l-bg-soft:#172124;--a30l-muted:#c2cac7;--a30l-line:#ffffff2e;--a30l-photo-x:59%;--a30l-photo-y:20%;--a30l-photo-mobile-x:57%;--a30l-photo-mobile-y:13%;--a30l-photo-filter:saturate(.9) contrast(1.03) brightness(.96)}
#atmosfera-30-landing[data-a30l-variant="daylight-blue"] .a30l-hero{background:radial-gradient(48% 68% at 78% 10%,#47b9e52e,#0000 66%),radial-gradient(46% 48% at 50% 108%,#91a99a26,#0000 72%),linear-gradient(120deg,#0d1416 0%,#111a1d 49%,#1b2729 100%)}
#atmosfera-30-landing[data-a30l-variant="daylight-blue"] .a30l-visual:before{background:linear-gradient(90deg,var(--a30l-bg) 0%,#0d1416e8 12%,#0d1416a0 40%,transparent 65%),linear-gradient(0deg,var(--a30l-bg) 0%,#0d14168c 13%,transparent 40%),linear-gradient(180deg,#0d14165e,transparent 27%)}
#atmosfera-30-landing[data-a30l-variant="warm-studio"]{--a30l-bg:#15130f;--a30l-bg-soft:#211e18;--a30l-muted:#cbc4b8;--a30l-line:#fff3dc2e;--a30l-photo-x:57%;--a30l-photo-y:8%;--a30l-photo-mobile-x:55%;--a30l-photo-mobile-y:6%;--a30l-photo-filter:saturate(.94) contrast(1.02) brightness(.96)}
#atmosfera-30-landing[data-a30l-variant="warm-studio"] .a30l-hero{background:radial-gradient(52% 70% at 78% 9%,#e7a95a2b,#0000 67%),radial-gradient(48% 48% at 50% 110%,#c8955724,#0000 72%),linear-gradient(120deg,#15130f 0%,#1b1813 49%,#28231b 100%)}
#atmosfera-30-landing[data-a30l-variant="warm-studio"] .a30l-visual:before{background:linear-gradient(90deg,var(--a30l-bg) 0%,#15130fe8 12%,#15130f9e 40%,transparent 65%),linear-gradient(0deg,var(--a30l-bg) 0%,#15130f8a 13%,transparent 40%),linear-gradient(180deg,#15130f5e,transparent 27%)}
#atmosfera-30-landing[data-a30l-variant="warm-studio"] .a30l-photo-frame:after{background:linear-gradient(105deg,#15130f55,#0000 50%,#e7a95a0b)}
@media (width>=1121px){
  #atmosfera-30-landing .a30l-visual{width:min(64vw,1080px)}
}
@media (width>=861px) and (height<=900px){
  #atmosfera-30-landing .a30l-intro{padding-top:30px}
  #atmosfera-30-landing .a30l-kicker{margin-bottom:15px}
  #atmosfera-30-landing .a30l-intro h1{font-size:clamp(42px,4.15vw,68px)}
  #atmosfera-30-landing .a30l-copy{padding-top:23px;padding-bottom:28px}
  #atmosfera-30-landing .a30l-goals{margin:10px 0 12px}
  #atmosfera-30-landing .a30l-break{padding-top:11px;padding-bottom:11px}
  #atmosfera-30-landing .a30l-pressure{margin-top:10px!important}
  #atmosfera-30-landing .a30l-questions{margin-top:9px}
  #atmosfera-30-landing .a30l-cta{min-height:56px;margin-top:14px}
}
@media (width<=860px){
  #atmosfera-30-landing .a30l-photo-frame img{object-position:var(--a30l-photo-mobile-x) var(--a30l-photo-mobile-y)}
  #atmosfera-30-landing[data-a30l-variant="midnight-blue"] .a30l-hero{background:radial-gradient(72% 42% at 82% 26%,#5ac5ef2e,#0000 70%),linear-gradient(155deg,#0b1317,#1b2b32 56%,#0b1317)}
  #atmosfera-30-landing[data-a30l-variant="midnight-blue"] .a30l-visual:before{background:linear-gradient(180deg,var(--a30l-bg) 0%,#0b13172b 15%,transparent 35%),linear-gradient(0deg,var(--a30l-bg) 0%,#0b13177d 14%,transparent 40%),linear-gradient(90deg,#0b1317c2,transparent 34%,#0b13171c)}
  #atmosfera-30-landing[data-a30l-variant="daylight-blue"] .a30l-hero{background:radial-gradient(72% 42% at 82% 26%,#47b9e52b,#0000 70%),linear-gradient(155deg,#0d1416,#1a2729 56%,#0d1416)}
  #atmosfera-30-landing[data-a30l-variant="daylight-blue"] .a30l-visual:before{background:linear-gradient(180deg,var(--a30l-bg) 0%,#0d14162e 15%,transparent 35%),linear-gradient(0deg,var(--a30l-bg) 0%,#0d141680 14%,transparent 40%),linear-gradient(90deg,#0d1416c7,transparent 34%,#0d14161f)}
  #atmosfera-30-landing[data-a30l-variant="warm-studio"] .a30l-hero{background:radial-gradient(72% 42% at 82% 26%,#e7a95a28,#0000 70%),linear-gradient(155deg,#15130f,#28231b 56%,#15130f)}
  #atmosfera-30-landing[data-a30l-variant="warm-studio"] .a30l-visual:before{background:linear-gradient(180deg,var(--a30l-bg) 0%,#15130f2e 15%,transparent 35%),linear-gradient(0deg,var(--a30l-bg) 0%,#15130f80 14%,transparent 40%),linear-gradient(90deg,#15130fc7,transparent 34%,#15130f1f)}
}
@media (width<=560px){
  #atmosfera-30-landing{width:100%;margin-left:0}
}
</style>
<script id="a30l-copy-corrections">
(function(){
  var root=document.getElementById('atmosfera-30-landing');
  var pressure=root&&root.querySelector('.a30l-pressure');
  if(pressure&&pressure.textContent.indexOf('выгорешь')!==-1){
    pressure.textContent=pressure.textContent.replace('выгорешь','выгоришь');
  }
})();
</script>`;
