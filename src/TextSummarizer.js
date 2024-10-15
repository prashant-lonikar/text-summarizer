import React, { useState, useEffect } from 'react';
import axios from 'axios';

const InstantDataCreator = () => {
  const [inputType, setInputType] = useState('text');
  const [inputText, setInputText] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [files, setFiles] = useState([]);
  const [summary, setSummary] = useState('');
  const [questions, setQuestions] = useState(['']);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  
  useEffect(() => {
    if (darkMode) {
    document.documentElement.classList.add('dark');
    } else {
    document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

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

  const generateCSV = () => {
    const headers = ['File Name', 'File Size', ...questions.map((q, i) => `Q${i + 1}: ${q}`)];
    const rows = answers.map(item => [
      item.fileName,
      item.fileSize,
      ...item.answers
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'question_answers.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className={`min-h-screen p-4 transition-colors duration-200 ${darkMode ? 'dark:bg-gray-900 dark:text-white' : 'bg-gray-100'}`}>
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400">
            Instant Data Creator
          </h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-4 py-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white transition-colors duration-200"
          >
            {darkMode ? '🌞' : '🌙'}
          </button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">OpenAI API Key:</label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Input Type:</label>
              <select
                value={inputType}
                onChange={(e) => setInputType(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="text">Text Input</option>
                <option value="file">File Upload</option>
              </select>
            </div>
            {inputType === 'text' ? (
              <div>
                <label htmlFor="inputText" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enter text to analyze:</label>
                <textarea
                  id="inputText"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows="6"
                  required
                ></textarea>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="fileInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload text or PDF files:</label>
                  <input
                    type="file"
                    id="fileInput"
                    accept=".txt,.pdf"
                    onChange={handleFileChange}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    multiple
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Questions:</label>
                  {questions.map((question, index) => (
                    <div key={index} className="flex mb-2">
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => handleQuestionChange(index, e.target.value)}
                        className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Enter your question"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="ml-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="mt-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200"
                  >
                    Add Question
                  </button>
                </div>
              </>
            )}
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Analyze'}
            </button>
          </form>
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
        {summary && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Summary:</h2>
            <p className="text-gray-700 dark:text-gray-300">{summary}</p>
          </div>
        )}
        {answers.length > 0 && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Results Table</h2>
              <button
                onClick={generateCSV}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200"
              >
                Export as CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="px-4 py-2 border-b dark:border-gray-600">File Name</th>
                    <th className="px-4 py-2 border-b dark:border-gray-600">File Size</th>
                    {questions.map((question, index) => (
                      <th key={index} className="px-4 py-2 border-b dark:border-gray-600">{`Q${index + 1}: ${question}`}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {answers.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}>
                      <td className="px-4 py-2 border-b dark:border-gray-700">{item.fileName}</td>
                      <td className="px-4 py-2 border-b dark:border-gray-700">{item.fileSize}</td>
                      {item.answers.map((answer, answerIndex) => (
                        <td key={answerIndex} className="px-4 py-2 border-b dark:border-gray-700">{answer}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstantDataCreator;