const fs = require('fs');
const path = require('path');

/**
 * Скрипт для копирования worker файлов в dist после сборки
 */
async function copyWorkers() {
  try {
    const srcDir = path.join(process.cwd(), 'src', 'cron-jobs');
    const distDir = path.join(process.cwd(), 'dist', 'src', 'cron-jobs');
    
    console.log('📁 Копирование worker файлов...');
    console.log(`📂 Источник: ${srcDir}`);
    console.log(`📂 Назначение: ${distDir}`);
    
    // Создаем папку назначения если её нет
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
      console.log('✅ Создана папка назначения');
    }
    
    // Читаем все файлы из src/cron-jobs
    const files = fs.readdirSync(srcDir);
    const workerFiles = files.filter(file => file.endsWith('.js'));
    
    console.log(`📋 Найдено ${workerFiles.length} worker файлов:`);
    
    // Копируем каждый worker файл
    for (const file of workerFiles) {
      const srcPath = path.join(srcDir, file);
      const distPath = path.join(distDir, file);
      
      fs.copyFileSync(srcPath, distPath);
      console.log(`✅ Скопирован: ${file}`);
    }
    
    console.log('🎉 Копирование worker файлов завершено успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при копировании worker файлов:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
copyWorkers(); 