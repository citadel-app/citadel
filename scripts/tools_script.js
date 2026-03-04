const https = require('https');

https.get('https://www.youtube.com/@3Blue1Brown', (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    const channelMatch = data.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
    const externalMatch = data.match(/"externalId":"(UC[a-zA-Z0-9_-]{22})"/);
    console.log('channelMatch:', channelMatch?.[1]);
    console.log('externalMatch:', externalMatch?.[1]);
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});
