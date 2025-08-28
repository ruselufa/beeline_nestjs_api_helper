const { parentPort } = require('worker_threads');

async function updateAbonentsInWorker() {
  try {
    console.log('Worker: Начинаем обновление абонентов...');
    
    parentPort.postMessage({ 
      type: 'progress', 
      data: 'Worker обновления абонентов запущен' 
    });

    // Симулируем получение данных из API
    const mockAbonents = [
      { userId: 1, phone: '+1234567890', firstName: 'Иван', lastName: 'Иванов', department: 'IT', extension: '100' },
      { userId: 2, phone: '+1234567891', firstName: 'Петр', lastName: 'Петров', department: 'Sales', extension: '101' },
      { userId: 3, phone: '+1234567892', firstName: 'Анна', lastName: 'Сидорова', department: 'Support', extension: '102' }
    ];
    
    parentPort.postMessage({ 
      type: 'progress', 
      data: `Получено ${mockAbonents.length} абонентов из API` 
    });

    // Симулируем обработку в базе данных
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    parentPort.postMessage({ 
      type: 'complete', 
      data: { 
        processed: mockAbonents.length, 
        total: mockAbonents.length,
        message: `Обработано ${mockAbonents.length} абонентов в worker`
      } 
    });

  } catch (error) {
    console.error('Worker: Ошибка обновления абонентов:', error);
    parentPort.postMessage({ 
      type: 'error', 
      data: error.message 
    });
  }
}

// Слушаем сообщения от основного потока
parentPort.on('message', (message) => {
  if (message.type === 'start') {
    updateAbonentsInWorker();
  }
});

// Обработка завершения worker
process.on('exit', (code) => {
  console.log(`Worker обновления абонентов завершен с кодом: ${code}`);
}); 