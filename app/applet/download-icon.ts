import fs from 'fs';
import https from 'https';

const url = 'https://i.postimg.cc/N02y1D0z/797f5eb692953cd6e73f8a257d1ad83afbe3bda7d4306d1f73a157d6e7859f59-2.png';
const file = fs.createWriteStream("public/icon-512.png");

https.get(url, function(response) {
  response.pipe(file);
  file.on("finish", () => {
    file.close();
    fs.copyFileSync("public/icon-512.png", "public/icon-192.png");
    console.log("Download Completed");
  });
});
