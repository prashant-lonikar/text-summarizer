import React, { useState } from 'react';
import axios from 'axios';

const TextSummarizer = () => {
  const [inputType, setInputType] = useState('text');
  const [inputText, setInputText] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [files, setFiles] = useState([]);
  const [summary, setSummary] = useState('');
  const [questions, setQuestions] = useState(['']);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleQuestionChange = (index, value) => {
    const newQuestions = [...questions];
    newQuestions[index] = value;
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([...questions, '']);
  };

  const removeQuestion = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
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

  const answerQuestion = async (text, question) => {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that answers questions based on the given text.' },
          { role: 'user', content: `Based on the following text, please answer this question: "${question}"\n\nText: ${text}` }
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
    setSummary('');
    setAnswers([]);

    try {
      if (inputType === 'text') {
        const result = await summarizeText(inputText);
        setSummary(result);
      } else {
        const fileContents = await Promise.all(files.map(readFileContent));
        const allAnswers = await Promise.all(
          fileContents.map(async (content, fileIndex) => {
            const fileAnswers = await Promise.all(
              questions.map(async (question) => {
                return await answerQuestion(content, question);
              })
            );
            return {
              fileName: files[fileIndex].name,
              fileSize: (files[fileIndex].size / 1024).toFixed(2) + ' KB',
              answers: fileAnswers,
            };
          })
        );
        setAnswers(allAnswers);
      }
    } catch (err) {
      setError('An error occurred while processing. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Text Analyzer</h1>
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
          <>
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
            <div>
              <label className="block mb-1">Questions:</label>
              {questions.map((question, index) => (
                <div key={index} className="flex mb-2">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => handleQuestionChange(index, e.target.value)}
                    className="flex-grow p-2 border rounded"
                    placeholder="Enter your question"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="ml-2 px-4 py-2 bg-red-500 text-white rounded"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addQuestion}
                className="mt-2 px-4 py-2 bg-green-500 text-white rounded"
              >
                Add Question
              </button>
            </div>
          </>
        )}
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Analyze'}
        </button>
      </form>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {summary && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-2">Summary:</h2>
          <p>{summary}</p>
        </div>
      )}
      {answers.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Results Table</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 border-b">File Name</th>
                  <th className="px-4 py-2 border-b">File Size</th>
                  {questions.map((question, index) => (
                    <th key={index} className="px-4 py-2 border-b">{`Q${index + 1}: ${question}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {answers.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-2 border-b">{item.fileName}</td>
                    <td className="px-4 py-2 border-b">{item.fileSize}</td>
                    {item.answers.map((answer, answerIndex) => (
                      <td key={answerIndex} className="px-4 py-2 border-b">{answer}</td>
                    ))}
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