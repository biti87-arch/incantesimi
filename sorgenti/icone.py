"""Genera le icone dell'app (libro aperto con una stella su fondo bruno) per Android, Windows e web."""
from PIL import Image, ImageDraw
import math, os
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
ORO=(212,168,75,255); ORO2=(139,105,20,255); CARTA=(250,243,224,255); RIGA=(196,170,120,255); STELLA=(196,89,17,255)
def sfondo(n):
    im=Image.new('RGBA',(n,n)); px=im.load(); c=n/2
    for y in range(n):
        for x in range(n):
            d=min(1,math.hypot(x-c,y-c)/(n*0.72))
            a=(92,44,22); b=(36,16,8)
            px[x,y]=tuple(int(a[i]*(1-d)+b[i]*d) for i in range(3))+(255,)
    return im
def primo_piano(n,sf=True):
    """Libro aperto color pergamena con copertina d'oro e una stella arancione sopra."""
    S=n*4; im=Image.new('RGBA',(S,S),(0,0,0,0)); dr=ImageDraw.Draw(im); s=S/1024
    # copertina
    dr.rounded_rectangle([150*s,330*s,874*s,800*s],radius=int(40*s),fill=ORO2)
    # pagine (due trapezi leggermente incurvati)
    for lato in (-1,1):
        cx=512*s
        pts=[(cx,360*s),(cx+lato*330*s,310*s),(cx+lato*340*s,760*s),(cx,790*s)]
        dr.polygon(pts,fill=CARTA)
        for k in range(5):
            y=410+k*70
            dr.line([(cx+lato*50*s,(y+8)*s),(cx+lato*290*s,(y-12)*s)],fill=RIGA,width=int(14*s))
    dr.line([(512*s,360*s),(512*s,790*s)],fill=ORO2,width=int(16*s))
    # bordo d'oro delle pagine
    dr.line([(512*s,790*s),(172*s,760*s)],fill=ORO,width=int(18*s)); dr.line([(512*s,790*s),(852*s,760*s)],fill=ORO,width=int(18*s))
    # stella a otto punte sopra il libro
    cx,cy=512*s,205*s; R1,R2=130*s,52*s
    pts=[]
    for i in range(16):
        r=R1 if i%2==0 else R2; t=math.pi*i/8-math.pi/2
        pts.append((cx+r*math.cos(t),cy+r*math.sin(t)))
    dr.polygon(pts,fill=STELLA)
    dr.ellipse([cx-34*s,cy-34*s,cx+34*s,cy+34*s],fill=ORO)
    return im.resize((n,n),Image.LANCZOS)
def icona(n,rotonda=False):
    im=sfondo(n); fg=primo_piano(n); im.alpha_composite(fg)
    if rotonda:
        m=Image.new('L',(n*4,n*4),0); ImageDraw.Draw(m).ellipse([0,0,n*4-1,n*4-1],fill=255)
        im.putalpha(m.resize((n,n),Image.LANCZOS))
    return im
def fg_adattivo(n):
    im=Image.new('RGBA',(n,n),(0,0,0,0)); f=primo_piano(int(n*0.62)); o=(n-f.size[0])//2
    im.alpha_composite(f,(o,o)); return im
def splash(w,h,scuro=False):
    im=Image.new('RGBA',(w,h),(22,19,14,255) if scuro else (250,243,224,255))
    f=primo_piano(int(min(w,h)*0.32)); im.alpha_composite(f,((w-f.size[0])//2,(h-f.size[1])//2)); return im
icona(1024).save(f'{R}/assets/icon-only.png'); fg_adattivo(1024).save(f'{R}/assets/icon-foreground.png')
sfondo(1024).save(f'{R}/assets/icon-background.png')
splash(2732,2732).save(f'{R}/assets/splash.png'); splash(2732,2732,True).save(f'{R}/assets/splash-dark.png')
icona(512).save(f'{R}/desktop/icon.png'); icona(192).save(f'{R}/www/icona.png')
res=f'{R}/android/app/src/main/res'
for d in os.listdir(res):
    p=os.path.join(res,d)
    for fn in os.listdir(p):
        fp=os.path.join(p,fn)
        if not fn.endswith('.png'): continue
        w,h=Image.open(fp).size
        if fn=='ic_launcher.png': icona(w).save(fp)
        elif fn=='ic_launcher_round.png': icona(w,True).save(fp)
        elif fn=='ic_launcher_foreground.png': fg_adattivo(w).save(fp)
        elif fn=='ic_launcher_background.png': sfondo(w).save(fp)
        elif fn=='splash.png': splash(w,h,'night' in d).save(fp)
print('ok')
