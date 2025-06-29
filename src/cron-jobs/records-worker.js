const { parentPort } = require('worker_threads');

async function loadRecordsInWorker() {
  try {
    console.log('Worker: Начинаем загрузку записей звонков...');
    
    parentPort.postMessage({ 
      type: 'progress', 
      data: 'Worker загрузки записей запущен' 
    });

    // Симулируем получение записей из API
    const mockRecords = [
      { id: 1, phone: '+1234567890', duration: 120, date: new Date().toISOString() },
      { id: 2, phone: '+1234567891', duration: 180, date: new Date().toISOString() },
      { id: 3, phone: '+1234567892', duration: 90, date: new Date().toISOString() }
    ];
    
    parentPort.postMessage({ 
      type: 'progress', 
      data: `Получено ${mockRecords.length} записей из API` 
    });

    // Симулируем обработку записей
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    parentPort.postMessage({ 
      type: 'complete', 
      data: { 
        processed: mockRecords.length, 
        total: mockRecords.length,
        message: `Обработано ${mockRecords.length} записей в worker`
      } 
    });

  } catch (error) {
    console.error('Worker: Ошибка загрузки записей:', error);
    parentPort.postMessage({ 
      type: 'error', 
      data: error.message 
    });
  }
}

// Слушаем сообщения от основного потока
parentPort.on('message', (message) => {
  if (message.type === 'start') {
    loadRecordsInWorker();
  }
});

// Обработка завершения worker
process.on('exit', (code) => {
  console.log(`Worker загрузки записей завершен с кодом: ${code}`);
}); 