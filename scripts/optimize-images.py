from PIL import Image
from pathlib import Path
root=Path(__file__).resolve().parent.parent/'assets/images'
for name,widths in {'apoteka-app-no-ad.jpg':[320,640,960],'apoteka-app-en.jpg':[320,640,960],'biljana-app-card.png':[200,400,607],'biljana-app-card-en.png':[200,400,607],'dr-biljana-begovic-vuksanovic.jpg':[200,400,800]}.items():
 im=Image.open(root/name).convert('RGB')
 for w in widths:
  dst=root/(Path(name).stem+f'-{w}.webp');im.resize((w,round(im.height*w/im.width)),Image.Resampling.LANCZOS).save(dst,'WEBP',quality=90,method=6)
  print(dst.name,dst.stat().st_size)
