// Тестовый файл для проверки логики определения неполных JSON ошибок

function isIncompleteJsonError(error, jsonString) {
	const errorMessage = error.message.toLowerCase();
	const jsonLower = jsonString.toLowerCase();
	
	// Все возможные ошибки парсинга JSON
	const jsonParseErrors = [
		'unexpected end of json input',
		'unexpected token',
		'unterminated string',
		'expected \',\' or \'}\' after property value',
		'expected \',\' or \']\' after array element',
		'unexpected number',
		'unexpected string',
		'unexpected boolean',
		'unexpected null',
		'unexpected end of data',
		'bad escaped character',
		'bad control character',
		'bad unicode escape',
		'duplicate key',
		'number too big',
		'number too small'
	];
	
	// Проверяем на ошибки парсинга
	const hasJsonParseError = jsonParseErrors.some(err => errorMessage.includes(err));
	
	// Проверяем структурную целостность JSON
	const hasStructuralIssues = (
		(jsonLower.includes('"table"') && !jsonLower.includes('"scoring"')) ||
		(jsonLower.includes('"blocks"') && !jsonLower.includes(']')) ||
		(jsonLower.includes('"headers"') && !jsonLower.includes(']'))
	);
	
	// Проверяем на незакрытые кавычки или скобки
	const hasUnclosedElements = (
		(jsonString.split('"').length % 2 !== 1) || // Нечетное количество кавычек
		(jsonString.split('{').length !== jsonString.split('}').length) || // Неравное количество скобок
		(jsonString.split('[').length !== jsonString.split(']').length) // Неравное количество квадратных скобок
	);
	
	return hasJsonParseError || hasStructuralIssues || hasUnclosedElements;
}

// Тестовые случаи
const testCases = [
	{
		name: "Ошибка с кавычками в строке",
		json: '{"value": "Использовать технику уточнения: \'Сергей, вы сказали "не надо", расскажите, что вас смущает?\'"}',
		expectedError: "Expected ',' or '}' after property value in JSON at position 7505"
	},
	{
		name: "Незакрытая скобка",
		json: '{"table": {"blocks": [{"name": "test"}]}',
		expectedError: "Unexpected end of JSON input"
	},
	{
		name: "Незакрытая кавычка",
		json: '{"value": "unclosed quote}',
		expectedError: "Unexpected end of JSON input"
	},
	{
		name: "Корректный JSON",
		json: '{"table": {"blocks": [{"name": "test"}]}, "scoring": {}}',
		expectedError: null
	}
];

console.log('🧪 Тестирование логики определения неполных JSON ошибок\n');

testCases.forEach((testCase, index) => {
	console.log(`Тест ${index + 1}: ${testCase.name}`);
	console.log(`JSON: ${testCase.json.substring(0, 100)}...`);
	
	if (testCase.expectedError) {
		const mockError = new Error(testCase.expectedError);
		const isIncomplete = isIncompleteJsonError(mockError, testCase.json);
		console.log(`Ожидаемая ошибка: ${testCase.expectedError}`);
		console.log(`Определена как неполная: ${isIncomplete ? '✅ ДА' : '❌ НЕТ'}`);
	} else {
		try {
			JSON.parse(testCase.json);
			console.log('✅ Корректный JSON - ошибок нет');
		} catch (error) {
			const isIncomplete = isIncompleteJsonError(error, testCase.json);
			console.log(`Неожиданная ошибка: ${error.message}`);
			console.log(`Определена как неполная: ${isIncomplete ? '✅ ДА' : '❌ НЕТ'}`);
		}
	}
	console.log('---\n');
}); 