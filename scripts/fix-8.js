const fs = require('fs');

const files = [
'src/renderer/src/ai/components/SmartActionsMenu.tsx',
'src/renderer/src/ai/components/SmartTagsDialog.tsx',
'src/renderer/src/ai/index.ts',
'src/renderer/src/ai/services/MetadataService.ts',
'src/renderer/src/components/SmartMetadataButton.tsx',
'src/renderer/src/components/youtube/YouTubeVideoCard.tsx',
'src/renderer/src/components/youtube/YouTubeVideoGrid.tsx',
'src/renderer/src/components/youtube/YouTubeVideoRow.tsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let raw = fs.readFileSync(f, 'utf8');
    raw = raw.replace(/['"]@shared(\/[\w-]+)*['"]/g, "'@citadel-app/core'");
    fs.writeFileSync(f, raw);
    console.log('Fixed', f);
  } else {
    console.log('Not found', f)
  }
});
