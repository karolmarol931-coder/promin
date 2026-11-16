import { Box, Card, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useMemo } from "react";
import { getToolDisabledReason } from "@editor/components/tools/fullscreen/shared";
import { useToolWorkflowData } from "@editor/contexts/ToolWorkflowContext";
import {
  SubcategoryId,
  type ToolRegistryEntry,
} from "@editor/data/toolsTaxonomy";
import { useAppConfig } from "@editor/contexts/AppConfigContext";
import type { ToolId } from "@editor/types/toolId";

const CATEGORY_NAMES: Record<SubcategoryId, string> = {
  [SubcategoryId.AI]: "Инструменты с ИИ",
  [SubcategoryId.SIGNING]: "Подпись",
  [SubcategoryId.DOCUMENT_SECURITY]: "Защита документа",
  [SubcategoryId.VERIFICATION]: "Проверка документа",
  [SubcategoryId.DOCUMENT_REVIEW]: "Сравнение и проверка",
  [SubcategoryId.PAGE_FORMATTING]: "Работа со страницами",
  [SubcategoryId.EXTRACTION]: "Извлечение данных",
  [SubcategoryId.REMOVAL]: "Удаление",
  [SubcategoryId.AUTOMATION]: "Автоматизация",
  [SubcategoryId.GENERAL]: "Основные инструменты",
  [SubcategoryId.ADVANCED_FORMATTING]: "Настройка страниц",
  [SubcategoryId.DEVELOPER_TOOLS]: "Для разработчиков",
};

const CATEGORY_ORDER = [
  SubcategoryId.GENERAL,
  SubcategoryId.PAGE_FORMATTING,
  SubcategoryId.SIGNING,
  SubcategoryId.DOCUMENT_SECURITY,
  SubcategoryId.VERIFICATION,
  SubcategoryId.DOCUMENT_REVIEW,
  SubcategoryId.EXTRACTION,
  SubcategoryId.REMOVAL,
  SubcategoryId.ADVANCED_FORMATTING,
  SubcategoryId.AUTOMATION,
  SubcategoryId.AI,
  SubcategoryId.DEVELOPER_TOOLS,
];

const TOOL_GUIDE: Partial<Record<ToolId, { name: string; purpose: string }>> = {
  pdfTextEditor: {
    name: "Редактор текста и изображений",
    purpose: "Изменяет текст и изображения в PDF.",
  },
  multiTool: {
    name: "Редактирование страниц",
    purpose:
      "В одной рабочей области позволяет менять порядок страниц, поворачивать их и удалять.",
  },
  merge: {
    name: "Объединить PDF",
    purpose: "Собирает несколько PDF-файлов в один документ.",
  },
  certSign: {
    name: "Подписать сертификатом",
    purpose: "Добавляет цифровую подпись с помощью файла сертификата.",
  },
  timestampPdf: {
    name: "Добавить отметку времени",
    purpose: "Подтверждает, что документ существовал в определённое время.",
  },
  sign: {
    name: "Добавить подпись",
    purpose:
      "Ставит в документе подпись, которую можно нарисовать, напечатать или добавить изображением.",
  },
  addText: {
    name: "Добавить текст",
    purpose: "Размещает новый текст в выбранном месте страницы.",
  },
  addImage: {
    name: "Добавить изображение",
    purpose:
      "Размещает изображение, например логотип или печать, на странице PDF.",
  },
  annotate: {
    name: "Заметки и выделения",
    purpose: "Выделяет текст, добавляет комментарии, фигуры и рисунки.",
  },
  addPassword: {
    name: "Защитить паролем",
    purpose:
      "Устанавливает пароль для открытия PDF и ограничения на его использование.",
  },
  watermark: {
    name: "Добавить водяной знак",
    purpose: "Добавляет на страницы текстовый или графический водяной знак.",
  },
  addStamp: {
    name: "Добавить штамп",
    purpose: "Ставит на страницы текстовый или графический штамп.",
  },
  sanitize: {
    name: "Очистить скрытые данные",
    purpose: "Удаляет из PDF скрытые данные и встроенные сценарии.",
  },
  flatten: {
    name: "Сделать документ статичным",
    purpose:
      "Превращает формы и интерактивные элементы в обычное содержимое страницы.",
  },
  unlockPDFForms: {
    name: "Разблокировать поля формы",
    purpose: "Снимает запрет на заполнение полей PDF-формы.",
  },
  formFill: {
    name: "Создать или заполнить форму",
    purpose:
      "Заполняет PDF-форму или добавляет в документ поля для заполнения.",
  },
  autoFormDetection: {
    name: "Найти поля формы",
    purpose:
      "Находит на странице места для ввода текста и превращает их в поля формы.",
  },
  changePermissions: {
    name: "Изменить разрешения",
    purpose:
      "Настраивает, можно ли печатать, копировать и редактировать документ.",
  },
  getPdfInfo: {
    name: "Сведения о PDF",
    purpose:
      "Показывает свойства документа: автора, название, размер и другие данные.",
  },
  validateSignature: {
    name: "Проверить цифровую подпись",
    purpose: "Проверяет цифровые подписи и сертификаты в документе.",
  },
  read: {
    name: "Читать PDF",
    purpose: "Открывает документ для чтения и просмотра страниц.",
  },
  changeMetadata: {
    name: "Изменить сведения о файле",
    purpose: "Меняет название, автора, тему и другие свойства PDF.",
  },
  editTableOfContents: {
    name: "Изменить оглавление",
    purpose: "Добавляет, удаляет и переименовывает закладки документа.",
  },
  crop: {
    name: "Обрезать страницы",
    purpose: "Убирает лишние поля по краям страниц.",
  },
  rotate: {
    name: "Повернуть страницы",
    purpose: "Поворачивает выбранные страницы на нужный угол.",
  },
  autoRotate: {
    name: "Исправить поворот страниц",
    purpose:
      "Определяет ориентацию текста и автоматически поворачивает страницы.",
  },
  split: {
    name: "Разделить PDF",
    purpose: "Разбивает один PDF на несколько файлов по выбранным страницам.",
  },
  reorganizePages: {
    name: "Переставить страницы",
    purpose:
      "Меняет порядок страниц, а также позволяет копировать и удалять их.",
  },
  scalePages: {
    name: "Изменить размер страниц",
    purpose: "Меняет формат страницы и размер её содержимого.",
  },
  addPageNumbers: {
    name: "Пронумеровать страницы",
    purpose: "Добавляет номера страниц в выбранное место.",
  },
  pageLayout: {
    name: "Несколько страниц на листе",
    purpose: "Размещает несколько страниц PDF на одной странице.",
  },
  bookletImposition: {
    name: "Подготовить буклет к печати",
    purpose:
      "Расставляет страницы в порядке, удобном для печати и складывания буклета.",
  },
  pdfToSinglePage: {
    name: "Собрать страницы в одну",
    purpose: "Соединяет все страницы в одну длинную страницу.",
  },
  addAttachments: {
    name: "Вложения PDF",
    purpose:
      "Добавляет файлы внутрь PDF, а также показывает и извлекает вложения.",
  },
  createPortfolio: {
    name: "Создать PDF-портфолио",
    purpose:
      "Собирает несколько файлов в один PDF-контейнер с отдельными вложениями.",
  },
  extractPages: {
    name: "Извлечь страницы",
    purpose: "Сохраняет выбранные страницы в отдельный PDF.",
  },
  extractImages: {
    name: "Извлечь изображения",
    purpose: "Сохраняет изображения из PDF в отдельные файлы.",
  },
  removePages: {
    name: "Удалить страницы",
    purpose: "Удаляет выбранные страницы из документа.",
  },
  removeBlanks: {
    name: "Удалить пустые страницы",
    purpose: "Находит и удаляет пустые страницы.",
  },
  removeAnnotations: {
    name: "Удалить заметки и выделения",
    purpose: "Удаляет комментарии, заметки и другие пометки.",
  },
  removeImage: {
    name: "Удалить изображения",
    purpose: "Удаляет изображения из PDF.",
  },
  removePassword: {
    name: "Снять пароль",
    purpose: "Снимает защиту, если известен пароль для открытия документа.",
  },
  removeCertSign: {
    name: "Удалить цифровую подпись",
    purpose: "Удаляет подпись и сертификат из документа.",
  },
  automate: {
    name: "Автоматизировать обработку",
    purpose: "Запускает несколько операций с документом одну за другой.",
  },
  autoRename: {
    name: "Переименовать по заголовку",
    purpose: "Задаёт имя файла по заголовку, найденному в документе.",
  },
  adjustContrast: {
    name: "Настроить изображение",
    purpose: "Меняет яркость, контрастность и насыщенность страниц.",
  },
  repair: {
    name: "Восстановить PDF",
    purpose: "Пытается исправить повреждённый файл, который не открывается.",
  },
  scannerImageSplit: {
    name: "Разделить сканированные фотографии",
    purpose:
      "Разделяет несколько фотографий, отсканированных на одной странице.",
  },
  overlayPdfs: {
    name: "Наложить один PDF на другой",
    purpose:
      "Совмещает страницы двух документов, например добавляет фон или бланк.",
  },
  replaceColor: {
    name: "Заменить или инвертировать цвета",
    purpose: "Меняет выбранные цвета или превращает цвета страниц в негатив.",
  },
  showJS: {
    name: "Показать встроенные сценарии",
    purpose: "Показывает сценарии JavaScript, которые находятся внутри PDF.",
  },
  devApi: {
    name: "API",
    purpose: "Документация для разработчиков.",
  },
  devFolderScanning: {
    name: "Автоматическая обработка папок",
    purpose: "Инструкция по автоматической обработке файлов из папки.",
  },
  devSsoGuide: {
    name: "Единый вход",
    purpose: "Инструкция по настройке единого входа для сервера.",
  },
  devAirgapped: {
    name: "Работа без сети",
    purpose: "Инструкция по установке сервера без подключения к интернету.",
  },
  compare: {
    name: "Сравнить документы",
    purpose: "Показывает различия между двумя PDF-файлами.",
  },
  classify: {
    name: "Определить тип документа",
    purpose: "Определяет категорию документа и добавляет к нему метку.",
  },
  compress: {
    name: "Уменьшить размер PDF",
    purpose:
      "Уменьшает размер файла, чтобы его было удобнее хранить и отправлять.",
  },
  convert: {
    name: "Преобразовать файл",
    purpose: "Преобразует PDF в другие форматы и другие файлы в PDF.",
  },
  ocr: {
    name: "Распознать текст на скане",
    purpose:
      "Распознаёт текст на изображениях страниц, чтобы его можно было искать и копировать.",
  },
  redact: {
    name: "Скрыть конфиденциальные данные",
    purpose: "Удаляет выбранный текст или область страницы из документа.",
  },
};

interface ListedTool {
  id: ToolId;
  tool: ToolRegistryEntry;
  name: string;
  purpose: string;
}

export function DeveloperDocs() {
  const { toolRegistry, toolAvailability } = useToolWorkflowData();
  const { config } = useAppConfig();

  const groups = useMemo(() => {
    const tools: ListedTool[] = Object.entries(toolRegistry).flatMap(
      ([rawId, tool]) => {
        if (!tool) return [];
        const id = rawId as ToolId;
        if (
          tool.link ||
          tool.hiddenFromToolList ||
          getToolDisabledReason(
            id,
            tool,
            toolAvailability,
            config?.premiumEnabled,
          ) !== null
        ) {
          return [];
        }

        const guide = TOOL_GUIDE[id];
        return [
          {
            id,
            tool,
            name: guide?.name ?? tool.name,
            purpose: guide?.purpose ?? tool.description,
          },
        ];
      },
    );

    return CATEGORY_ORDER.map((subcategoryId) => ({
      id: subcategoryId,
      name: CATEGORY_NAMES[subcategoryId],
      tools: tools.filter(({ tool }) => tool.subcategoryId === subcategoryId),
    })).filter(({ tools: groupTools }) => groupTools.length > 0);
  }, [config?.premiumEnabled, toolAvailability, toolRegistry]);

  return (
    <Box h="100%" p="lg" style={{ overflowY: "auto", minHeight: 0 }}>
      <Stack gap="lg">
        <div>
          <Title order={1}>Справка</Title>
          <Text mt="xs">
            Promin помогает работать с PDF-файлами на этом Mac. Вход в аккаунт
            не нужен.
          </Text>
        </div>

        <Card withBorder>
          <Stack gap="xs">
            <Title order={2}>Как обработать файл</Title>
            <Text>1. Откройте PDF или перетащите его в окно программы.</Text>
            <Text>2. Выберите подходящий инструмент из списка.</Text>
            <Text>3. Настройте параметры и запустите обработку.</Text>
            <Text>4. Сохраните готовый файл на Mac.</Text>
          </Stack>
        </Card>

        <div>
          <Title order={2}>Инструменты</Title>
          <Text mt="xs" mb="md">
            Здесь перечислены доступные инструменты и простое объяснение, что
            делает каждый из них.
          </Text>
          <Stack gap="lg">
            {groups.map((group) => (
              <section key={group.id}>
                <Title order={3} mb="sm">
                  {group.name}
                </Title>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  {group.tools.map(({ id, name, purpose }) => (
                    <Card key={id} withBorder p="sm">
                      <Text fw={600}>{name}</Text>
                      <Text size="sm" mt={4}>
                        {purpose}
                      </Text>
                    </Card>
                  ))}
                </SimpleGrid>
              </section>
            ))}
          </Stack>
        </div>
      </Stack>
    </Box>
  );
}
