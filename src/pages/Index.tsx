const Index = () => {
  const generateEbook = async () => {
    const title = "AI Business Blueprint";

    const res = await fetch(
      "https://zprgfzoxlgaxbnnjvvir.supabase.co/functions/v1/generate-ebook-content",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      }
    );

    const data = await res.json();
    console.log(data.content);
    alert("Ebook generated — check console");
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <button
        onClick={generateEbook}
        className="px-6 py-3 bg-black text-white rounded-lg"
      >
        Generate Ebook
      </button>
    </div>
  );
};

export default Index;
