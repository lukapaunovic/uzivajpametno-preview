from pathlib import Path
from bs4 import BeautifulSoup,Comment,Doctype
import json
root=Path(__file__).resolve().parent.parent
D=json.loads((root/'translations/en.json').read_text())
base='/uzivajpametno-preview/';host='https://lukapaunovic.github.io'
routes={'index.html':'en/index.html','privatnost/index.html':'en/privacy/index.html','izvori/index.html':'en/resources/index.html','pocni/index.html':'en/start/index.html','404.html':'en/404.html'}
def url(f):return base+f.removesuffix('index.html')
def translate(s):return D.get(s,s)
for sr,en in routes.items():
 original=BeautifulSoup((root/sr).read_text(),'html.parser')
 for el in original.select('.language-switch,link[hreflang]'):el.decompose()
 for lang,file in [('sr',sr),('en',en)]:
  s=BeautifulSoup(str(original),'html.parser');s.html['lang']=lang
  if lang=='en':
   for el in s.select('.reader-transcript'):el['lang']='sr'
   for t in list(s.find_all(string=True)):
    if isinstance(t,(Comment,Doctype)) or t.parent.name in ['script','style']:continue
    v=str(t);key=v.strip()
    if key in D:t.replace_with(v.replace(key,D[key]))
   for e in s.find_all():
    for k in ['alt','aria-label','title','content']:
     if k in e.attrs:e[k]=translate(e[k])
    if e.name=='a' and e.get('href','').startswith(base):
     v=e['href'];path,sep,fragment=v.partition('#')
     for a,b in routes.items():
      if path==url(a):e['href']=url(b)+(sep+fragment if sep else '');break
   for e in s.select('meta[property="og:locale"]'):e['content']='en_GB'
   for e in s.select('meta[property^="og:image"],meta[name="twitter:image"]'):
    if e.get('content','').startswith('https://'):e['content']=host+base+'assets/images/social-preview-play-safe.png'
   s.select_one('meta[property="og:image:type"]')['content']='image/png'
   for img in s.select('.app-screen'):
    img['src']=base+'assets/images/apoteka-app-en.jpg';img['width']='1206';img['height']='2398';img['alt']='The Apoteka.rs app home screen in English.'
   for img in s.select('.app-doctor-card'):
    img['src']=base+'assets/images/biljana-app-card-en.png';img['alt']="Dr Biljana Begović Vuksanović - book a consultation or a doctor's exam with the option of issuing an ePrescription."
   for old in s.select('.brand-logo'):
    old.replace_with(BeautifulSoup((root/'assets/images/play-safe-logo.svg').read_text(),'html.parser').svg)
   for icon in s.select('link[rel="icon"]'):icon['href']=base+'assets/images/favicon-en.svg'
   note=s.select_one('.instagram-intro')
   if note:
    p=s.new_tag('p',attrs={'class':'small-note'});p.string='Instagram posts are in Serbian.';note.append(p)
  if not s.select_one('link[rel="canonical"]'):s.head.append(s.new_tag('link',rel='canonical',href=host+url(file)))
  for e in s.select('link[rel="canonical"]'):e['href']=host+url(file)
  s.select_one('meta[property="og:url"]')['content']=host+url(file)
  for code,target in [('sr',sr),('en',en),('x-default',sr)]:s.head.append(s.new_tag('link',rel='alternate',hreflang=code,href=host+url(target)))
  nav=s.new_tag('nav',attrs={'class':'language-switch','aria-label':'Language' if lang=='en' else 'Jezik'})
  for code,target in [('sr',sr),('en',en)]:
   a=s.new_tag('a',href=url(target),hreflang=code,lang=code);a.string=code.upper()
   if code==lang:a['aria-current']='page'
   nav.append(a)
  s.select_one('.menu-toggle').insert_before(nav)
  for e in s.select('link[href*="main.css"]'):e['href']=base+'assets/css/main.css?ver=1.0.18'
  for e in s.select('script[src*="reader.js"]'):e['src']=base+'assets/js/reader.js?ver=1.0.4'
  for e in s.select('script[src*="main.js"]'):e['src']=base+'assets/js/main.js?ver=1.0.3'
  out=str(s).replace('viewbox=','viewBox=')
  if lang=='en':
   for a,b in [('—','-'),('–','-'),('„','"'),('“','"'),('”','"'),('’',"'")]:out=out.replace(a,b)
  p=root/file;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(out)
