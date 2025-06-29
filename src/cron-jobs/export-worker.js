const { parentPort } = require('worker_threads');

async function exportToGoogleSheetsInWorker() {
  try {
    console.log('Worker: Начинаем экспорт в Google Sheets...');
    
    parentPort.postMessage({ 
      type: 'progress', 
      data: 'Worker экспорта в Google Sheets запущен' 
    });

    // Симулируем получение данных для экспорта
    const mockData = [
      { id: 1, name: 'Иван Иванов', calls: 15, duration: 1200 },
      { id: 2, name: 'Петр Петров', calls: 22, duration: 1800 },
      { id: 3, name: 'Анна Сидорова', calls: 18, duration: 1500 }
    ];
    
    parentPort.postMessage({ 
      type: 'progress', 
      data: `Подготовлено ${mockData.length} записей для экспорта` 
    });

    // Симулируем процесс экспорта в Google Sheets
    await new Promise(resolve => setTimeout(resolve, 2000));
    parentPort.postMessage({ 
      type: 'progress', 
      data: 'Подключение к Google Sheets API' 
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
    parentPort.postMessage({ 
      type: 'progress', 
      data: 'Загрузка данных в таблицу' 
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    parentPort.postMessage({ 
      type: 'complete', 
      data: { 
        processed: mockData.length, 
        total: mockData.length,
        message: `Экспортировано ${mockData.length} записей в Google Sheets через worker`
      } 
    });

  } catch (error) {
    console.error('Worker: Ошибка экспорта в Google Sheets:', error);
    parentPort.postMessage({ 
      type: 'error', 
      data: error.message 
    });
  }
}

// Слушаем сообщения от основного потока
parentPort.on('message', (message) => {
  if (message.type === 'start') {
    exportToGoogleSheetsInWorker();
  }
});

// Обработка завершения worker
process.on('exit', (code) => {
  console.log(`Worker экспорта в Google Sheets завершен с кодом: ${code}`);
}); 