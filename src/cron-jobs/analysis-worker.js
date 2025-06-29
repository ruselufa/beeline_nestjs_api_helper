const { parentPort } = require('worker_threads');

async function analyzeConversationsInWorker() {
  try {
    console.log('Worker: Начинаем анализ разговоров...');
    
    parentPort.postMessage({ 
      type: 'progress', 
      data: 'Worker анализа разговоров запущен' 
    });

    // Симулируем получение транскрипций для анализа
    const mockTranscripts = [
      { id: 1, text: 'Здравствуйте, как дела?', duration: 120 },
      { id: 2, text: 'Спасибо за звонок, до свидания', duration: 180 },
      { id: 3, text: 'Могу я вам помочь?', duration: 90 }
    ];
    
    parentPort.postMessage({ 
      type: 'progress', 
      data: `Найдено ${mockTranscripts.length} транскрипций для анализа` 
    });

    // Симулируем процесс анализа с помощью AI
    for (let i = 0; i < mockTranscripts.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      parentPort.postMessage({ 
        type: 'progress', 
        data: `Проанализирована транскрипция ${i + 1}/${mockTranscripts.length} с помощью AI` 
      });
    }
    
    parentPort.postMessage({ 
      type: 'complete', 
      data: { 
        processed: mockTranscripts.length, 
        total: mockTranscripts.length,
        message: `Проанализировано ${mockTranscripts.length} разговоров в worker`
      } 
    });

  } catch (error) {
    console.error('Worker: Ошибка анализа разговоров:', error);
    parentPort.postMessage({ 
      type: 'error', 
      data: error.message 
    });
  }
}

// Слушаем сообщения от основного потока
parentPort.on('message', (message) => {
  if (message.type === 'start') {
    analyzeConversationsInWorker();
  }
});

// Обработка завершения worker
process.on('exit', (code) => {
  console.log(`Worker анализа разговоров завершен с кодом: ${code}`);
}); 