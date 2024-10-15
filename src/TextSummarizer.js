import React, { useState } from 'react';
import axios from 'axios';

const TextSummarizer = () => {
  const [apiKey, setApiKey] = useState('');
  const [files, setFiles] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const typedarray = new Uint8Array(event.target.result);
          try {
            const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              const strings = content.items.map(item => item.str);
              fullText += strings.join(' ') + '\n';
            }
            resolve(fullText);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
      }
    });
  };

  const summarizeText = async (text) => {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that summarizes text.' },
          { role: 'user', content: `Please summarize the following text in about 50 words:\n\n${text}` }
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.choices[0].message.content;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSummaries([]);

    try {
      const summariesPromises = files.map(async (file) => {
        const content = await readFileContent(file);
        const summary = await summarizeText(content);
        return {
          fileName: file.name,
          fileSize: (file.size / 1024).toFixed(2) + ' KB',
          summary: summary
        };
      });

      const results = await Promise.all(summariesPromises);
      setSummaries(results);
    } catch (err) {
      setError('An error occurred while processing the files. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Multi-Document Text Summarizer</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="apiKey" className="block mb-1">OpenAI API Key:</label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label htmlFor="fileInput" className="block mb-1">Upload text or PDF files:</label>
          <input
            type="file"
            id="fileInput"
            accept=".txt,.pdf"
            onChange={handleFileChange}
            className="w-full p-2 border rounded"
            multiple
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={isLoading}
        >
          {isLoading ? 'Summarizing...' : 'Summarize Files'}
        </button>
      </form>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {summaries.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Summary Table</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 border-b">File Name</th>
                  <th className="px-4 py-2 border-b">File Size</th>
                  <th className="px-4 py-2 border-b">Summary</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-2 border-b">{item.fileName}</td>
                    <td className="px-4 py-2 border-b">{item.fileSize}</td>
                    <td className="px-4 py-2 border-b">{item.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextSummarizer;