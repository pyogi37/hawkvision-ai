import React, { useState, useRef, useEffect, MouseEvent } from 'react';
import imageUrl from './assets/image.jpg';

interface Point { x: number; y: number; }
interface Line { start: Point | null; end: Point | null; }
type Polygon = Point[];

const PolygonDrawer: React.FC = () => {
    const [img, setImg] = useState<HTMLImageElement | null>(null); // Stores loaded image
    const [loaded, setLoaded] = useState(false); // Tracks image load status
    const [drawing, setDrawing] = useState(false); // Tracks if user is drawing
    const [line, setLine] = useState<Line>({ start: null, end: null }); // Stores initial line segment
    const [currentPoly, setCurrentPoly] = useState<Polygon>([]); // Stores active polygon being drawn
    const [polys, setPolys] = useState<Polygon[]>([]); // Stores completed polygons
    const [nearClose, setNearClose] = useState(false); // Tracks if mouse is near first point to close the polygon
    const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 }); // Stores current mouse position
    const canvasRef = useRef<HTMLCanvasElement>(null); // Reference to canvas element
    

  useEffect(() => {
    const image = new Image();
    image.src = imageUrl;
    image.onload = () => { setImg(image); setLoaded(true); };
  }, []);

  const getCentroid = (pts: Polygon) => {
    const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / pts.length, y: sum.y / pts.length };
  };

  const distance = (p1: Point, p2: Point) => Math.hypot(p2.x - p1.x, p2.y - p1.y);

  const drawCircleLabel = (ctx: CanvasRenderingContext2D, p: Point, label: string, r = 4, fill = '#00ff00') => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.font = '12px Arial';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeText(label, p.x + 5, p.y - 5);
    ctx.fillText(label, p.x + 5, p.y - 5);
  };

  const drawPoly = (ctx: CanvasRenderingContext2D, pts: Polygon, idx: number) => {
    if (pts.length < 3) return;
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.strokeStyle = '#0000ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,255,0.1)';
    ctx.fill();
    const cent = getCentroid(pts);
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(idx.toString(), cent.x - 5, cent.y + 5);
    ctx.fillText(idx.toString(), cent.x - 5, cent.y + 5);
    pts.forEach((p, i) => drawCircleLabel(ctx, p, String.fromCharCode(65 + i)));
  };

  useEffect(() => {
    if (!loaded || !img || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
    polys.forEach((p, i) => drawPoly(ctx, p, i + 1));
    if (currentPoly.length) {
      ctx.beginPath();
      currentPoly.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.stroke();
      currentPoly.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#00ff00';
        ctx.fill();
      });
    }
    if (line.start && line.end) {
      ctx.beginPath();
      ctx.moveTo(line.start.x, line.start.y);
      ctx.lineTo(line.end.x, line.end.y);
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.stroke();
      [line.start, line.end].forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff0000';
        ctx.fill();
      });
    }
    if (nearClose && currentPoly.length > 2) {
      ctx.beginPath();
      ctx.arc(currentPoly[0].x, currentPoly[0].y, 10, 0, 2 * Math.PI);
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '12px Arial';
      ctx.fillStyle = '#fff';
      ctx.fillRect(currentPoly[0].x + 10, currentPoly[0].y - 20, 120, 20);
      ctx.fillStyle = '#000';
      ctx.fillText('Drop to complete', currentPoly[0].x + 15, currentPoly[0].y - 5);
    }
  }, [loaded, img, line, currentPoly, polys, mousePos, nearClose]);

  const handleMouse = (e: MouseEvent<HTMLCanvasElement>, type: 'down' | 'move' | 'up') => {
    if (!loaded || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (type === 'down') {
      if (currentPoly.length) {
        if (nearClose && currentPoly.length > 2) { completePoly(); return; }
        setCurrentPoly([...currentPoly, pos]);
        return;
      }
      if (line.start && line.end) {
        const onLine = Math.abs(distance(line.start, pos) + distance(line.end, pos) - distance(line.start, line.end)) < 10;
        if (onLine) { setCurrentPoly([pos]); return; }
      }
      setDrawing(true);
      setLine({ start: pos, end: pos });
    } else if (type === 'move') {
      setMousePos(pos);
      if (drawing) { setLine({ ...line, end: pos }); return; }
      if (currentPoly.length > 2) setNearClose(distance(currentPoly[0], pos) < 10);
    } else {
      setDrawing(false);
    }
  };

  const completePoly = () => {
    if (currentPoly.length < 3) return;
    setPolys([...polys, currentPoly]);
    setCurrentPoly([]);
    setNearClose(false);
  };

  const resetAll = () => {
    setLine({ start: null, end: null });
    setCurrentPoly([]);
    setPolys([]);
    setDrawing(false);
    setNearClose(false);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl p-4">
      <h1 className="text-3xl font-bold mb-4">Polygon Drawing Tool</h1>
      <button onClick={resetAll} className="mb-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
        Reset
      </button>
      <div className="relative border-2 border-gray-300 shadow-md">
        {!loaded && <div className="absolute inset-0 flex items-center justify-center bg-gray-100">Loading image...</div>}
        <canvas
          ref={canvasRef}
          width={600}
          height={600}
          onMouseDown={(e) => handleMouse(e, 'down')}
          onMouseMove={(e) => handleMouse(e, 'move')}
          onMouseUp={(e) => handleMouse(e, 'up')}
          onMouseLeave={(e) => handleMouse(e, 'up')}
          className="cursor-crosshair"
        />
      </div>
      <div className="mt-6 w-full">
        <h2 className="text-2xl font-bold mb-2">Polygon Coordinates</h2>
        {polys.length === 0 ? (
          <p className="text-gray-500">No polygons drawn yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
            {polys.map((poly, i) => (
              <div key={i} className="border rounded p-4 bg-gray-50">
                <h3 className="font-bold mb-2">Polygon {i + 1}</h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border p-2 text-left">Point</th>
                      <th className="border p-2 text-left">X</th>
                      <th className="border p-2 text-left">Y</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poly.map((p, j) => (
                      <tr key={j}>
                        <td className="border p-2">{String.fromCharCode(65 + j)}</td>
                        <td className="border p-2">{Math.round(p.x)}</td>
                        <td className="border p-2">{Math.round(p.y)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PolygonDrawer;
