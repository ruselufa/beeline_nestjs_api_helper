const { parentPort } = require('worker_threads');

async function transcribeRecordsInWorker() {
  try {
    console.log('Worker: Начинаем транскрибацию записей...');
    
    parentPort.postMessage({ 
      type: 'progress', 
      data: 'Worker транскрибации запущен' 
    });

    // Симулируем получение записей для транскрибации
    const mockRecords = [
      { id: 1, file: 'record_001.wav', duration: 120 },
      { id: 2, file: 'record_002.wav', duration: 180 },
      { id: 3, file: 'record_003.wav', duration: 90 }
    ];
    
    parentPort.postMessage({ 
      type: 'progress', 
      data: `Найдено ${mockRecords.length} записей для транскрибации` 
    });

    // Симулируем процесс транскрибации
    for (let i = 0; i < mockRecords.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      parentPort.postMessage({ 
        type: 'progress', 
        data: `Транскрибирована запись ${i + 1}/${mockRecords.length}` 
      });
    }
    
    parentPort.postMessage({ 
      type: 'complete', 
      data: { 
        processed: mockRecords.length, 
        total: mockRecords.length,
        message: `Транскрибировано ${mockRecords.length} записей в worker`
      } 
    });

  } catch (error) {
    console.error('Worker: Ошибка транскрибации:', error);
    parentPort.postMessage({ 
      type: 'error', 
      data: error.message 
    });
  }
}

// Слушаем сообщения от основного потока
parentPort.on('message', (message) => {
  if (message.type === 'start') {
    transcribeRecordsInWorker();
  }
});

// Обработка завершения worker
process.on('exit', (code) => {
  console.log(`Worker транскрибации завершен с кодом: ${code}`);
}); 