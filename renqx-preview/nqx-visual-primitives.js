export function px(ctx,x,y,s,c,a=1){ctx.globalAlpha=a;ctx.fillStyle=c;ctx.fillRect(Math.round(x)*s,Math.round(y)*s,s,s)}
export function hsl(h,s,l,a=1){return `hsla(${h} ${s}% ${l}% / ${a})`}
export function line(ctx,x1,y1,x2,y2,s,c,a=1){const dx=x2-x1,dy=y2-y1,n=Math.max(Math.abs(dx),Math.abs(dy),1);for(let i=0;i<=n;i++)px(ctx,x1+dx*i/n,y1+dy*i/n,s,c,a)}
export function ellipse(ctx,cx,cy,rx,ry,s,c,a=1,fill=.97){for(let y=-ry-1;y<=ry+1;y++)for(let x=-rx-1;x<=rx+1;x++){const d=x*x/(rx*rx)+y*y/(ry*ry);if(d<=fill)px(ctx,cx+x,cy+y,s,c,a)}}
export function diamond(ctx,cx,cy,w,h,s,c,a=1){for(let y=-h;y<=h;y++){const span=Math.max(0,Math.round(w*(1-Math.abs(y)/(h||1))));for(let x=-span;x<=span;x++)px(ctx,cx+x,cy+y,s,c,a)}}
export function circle(ctx,cx,cy,r,s,c,a=1){ellipse(ctx,cx,cy,r,r,s,c,a,.97)}
export function ring(ctx,cx,cy,r,s,c,a=1){for(let y=-r-1;y<=r+1;y++)for(let x=-r-1;x<=r+1;x++){const d=Math.hypot(x,y);if(d>=r-.65&&d<=r+.65)px(ctx,cx+x,cy+y,s,c,a)}}
export function shard(ctx,cx,cy,len,dir,s,c,a=1){const vx=Math.cos(dir),vy=Math.sin(dir);for(let i=0;i<len;i++){px(ctx,cx+vx*i,cy+vy*i,s,c,a);if(i>1)px(ctx,cx+vx*i-vy*.8,cy+vy*i+vx*.8,s,c,a*.65)}}
export function tendril(ctx,cx,cy,len,dir,curve,s,c,a=1){let x=cx,y=cy;for(let i=1;i<=len;i++){x+=Math.cos(dir)+Math.sin(i*.7+curve)*.35;y+=Math.sin(dir)+Math.cos(i*.45+curve)*.2;px(ctx,x,y,s,c,a)}}
export function orbit(ctx,cx,cy,r,count,phase,s,c,a=1){for(let i=0;i<count;i++){const ang=phase+i/count*Math.PI*2;px(ctx,cx+Math.cos(ang)*r,cy+Math.sin(ang)*r,s,c,a)}}
export function core(ctx,cx,cy,s,glow,black=false){px(ctx,cx,cy,s,black?'#06070b':glow,1);px(ctx,cx,cy-1,s,glow,.92);px(ctx,cx-1,cy,s,glow,.56);px(ctx,cx+1,cy,s,glow,.56)}
