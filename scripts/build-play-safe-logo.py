from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
root=Path(__file__).resolve().parent.parent
font=TTFont(root/'assets/fonts/dynapuff-regular-latin.woff2');glyphs=font.getGlyphSet();cmap=font.getBestCmap();upem=font['head'].unitsPerEm

def line(text,size,y):
 scale=size/upem;width=sum(glyphs[cmap[ord(c)]].width for c in text)*scale;x=(240-width)/2;paths=[]
 for char in text:
  glyph=glyphs[cmap[ord(char)]];pen=SVGPathPen(glyphs);glyph.draw(TransformPen(pen,(scale,0,0,-scale,x,y)));paths.append('<path d="'+pen.getCommands()+'"/>');x+=glyph.width*scale
 return ''.join(paths)
art='<g transform="rotate(-6 120 90)">'+line('Play',86,79)+line('Safe',86,162)+'</g>'
svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" width="146" height="78" fill="currentColor" class="brand-logo" aria-hidden="true" focusable="false"><title>Play Safe</title>'+art+'</svg>'
(root/'assets/images/play-safe-logo.svg').write_text(svg)
(root/'assets/images/favicon-en.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>Play Safe</title><rect width="64" height="64" rx="16" fill="#17036a"/><g fill="white" transform="translate(1 5) scale(.258)">'+art+'</g></svg>')
