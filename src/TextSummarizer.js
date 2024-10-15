import React, { useState } from 'react';
import axios from 'axios';

const TextSummarizer = () => {
  const [inputType, setInputType] = useState('text');
  const [inputText, setInputText] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSummary('');

    let textToSummarize = inputText;

    if (inputType === 'file' && file) {
      try {
        textToSummarize = await readFileContent(file);
      } catch (err) {
        setError('Error reading file. Please try again.');
        setIsLoading(false);
        return;
      }
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that summarizes text.' },
            { role: 'user', content: `Please summarize the following text:\n\n${textToSummarize}` }
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setSummary(response.data.choices[0].message.content);
    } catch (err) {
      setError('An error occurred while summarizing the text. Please check your API key and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Text Summarizer</h1>
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
          <label className="block mb-1">Input Type:</label>
          <select
            value={inputType}
            onChange={(e) => setInputType(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="text">Text Input</option>
            <option value="file">File Upload</option>
          </select>
        </div>
        {inputType === 'text' ? (
          <div>
            <label htmlFor="inputText" className="block mb-1">Enter text to summarize:</label>
            <textarea
              id="inputText"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full p-2 border rounded"
              rows="6"
              required
            ></textarea>
          </div>
        ) : (
          <div>
            <label htmlFor="fileInput" className="block mb-1">Upload a text file (.txt):</label>
            <input
              type="file"
              id="fileInput"
              accept=".txt"
              onChange={handleFileChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        )}
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={isLoading}
        >
          {isLoading ? 'Summarizing...' : 'Summarize'}
        </button>
      </form>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {summary && (
        <div className="mt-4">
          <h2 className="text-xl font-bold mb-2">Summary:</h2>
          <p>{summary}</p>
        </div>
      )}
    </div>
  );
};

export default TextSummarizer;