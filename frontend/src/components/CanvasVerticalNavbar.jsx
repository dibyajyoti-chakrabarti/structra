export default function CanvasVerticalNavbar() {
  return (
    <div className="bg-gray-500 text-white w-16 h-full flex flex-col items-center gap-4 py-4">
      <button className="p-2 hover:bg-gray-600 rounded" title="Pen">✏️</button>
      <button className="p-2 hover:bg-gray-600 rounded" title="Text">T</button>
      <button className="p-2 hover:bg-gray-600 rounded" title="Shapes">◻️</button>
      <button className="p-2 hover:bg-gray-600 rounded" title="Frames">🖼️</button>
      <div className="flex-grow"></div>
      <button className="p-2 hover:bg-gray-600 rounded" title="Undo">↶</button>
      <button className="p-2 hover:bg-gray-600 rounded" title="Redo">↷</button>
      <button className="p-2 hover:bg-gray-600 rounded" title="Search">🔍</button>
    </div>
  );
}
