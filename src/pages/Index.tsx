// After getting response from content function
if (error) {
  console.error('Generation failed:', error); // This might be your "Generation Failed" message
} else {
  // Download PDF
  const pdfLink = document.createElement('a');
  pdfLink.href = data.pdfUrl; // The base64 URL from response
  pdfLink.download = `${data.title || 'ebook'}.pdf`;
  document.body.appendChild(pdfLink);
  pdfLink.click();
  document.body.removeChild(pdfLink);

  // Download Cover (from cover function response)
  const coverLink = document.createElement('a');
  coverLink.href = coverData.imageUrl; // From generate-ebook-cover invoke
  coverLink.download = `${data.title || 'cover'}.svg`; // Or .png if you convert it
  document.body.appendChild(coverLink);
  coverLink.click();
  document.body.removeChild(coverLink);
}
