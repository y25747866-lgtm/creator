const generateEbook = async () => {
  if (!topic.trim()) {
    toast({
      title: "Topic Required",
      description: "Please enter a topic for your ebook.",
      variant: "destructive",
    });
    return;
  }

  setIsGenerating(true);
  setProgress(0);
  setStatus("Initializing AI...");
  setGeneratedEbook(null);

  try {
    setProgress(15);
    setStatus("Analyzing topic and generating content...");
    
    const { data: contentData, error: contentError } = await supabase.functions.invoke(
      "generate-ebook-content",
      { body: { topic, title: generatedTitle || topic } }
    );

    if (contentError) throw contentError;

    setProgress(50);
    setStatus("Content generated! Creating cover image...");

    const { data: coverData, error: coverError } = await supabase.functions.invoke(
      "generate-ebook-cover",
      { body: { title: generatedTitle || topic, topic } }
    );

    if (coverError) throw coverError;

    setProgress(85);
    setStatus("Compiling your professional ebook...");

    const ebook: Ebook = {
      id: crypto.randomUUID(),
      title: generatedTitle || topic,
      topic,
      content: contentData.content,
      coverImageUrl: coverData.imageUrl,
      pages: contentData.pages || Math.ceil(contentData.content.length / 2000),
      createdAt: new Date().toISOString(),
      pdfUrl: contentData.pdfUrl, // This is the new direct PDF link!
    };

    addEbook(ebook);
    setGeneratedEbook(ebook);
    setProgress(100);
    setStatus("Complete!");

    toast({
      title: "Ebook Generated!",
      description: `Your ${ebook.pages}-page ebook is ready for download.`,
    });
  } catch (error: unknown) {
    console.error("Error generating ebook:", error);
    toast({
      title: "Generation Failed",
      description: error instanceof Error ? error.message : "An error occurred while generating your ebook.",
      variant: "destructive",
    });
  } finally {
    setIsGenerating(false);
  }
};
