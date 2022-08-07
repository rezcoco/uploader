const axios = require('axios');
const utils = require('utils');
const url = process.argv[2];

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  "DNT": "1",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1"
};

(async () => {
  try {
    const resp = await axios.get(url, { headers })
    var $ = cheerio.load(resp.data);
      var cook = utils.cookieString(scp.parse(resp.headers["set-cookie"]));
      for (var c in $("head script")) {
        if ($("head script")[c].attribs && $("head script")[c].attribs.src && $("head script")[c].attribs.src.includes("?render")) {
          var sk = u.parse($("head script")[c].attribs.src, true).query.render;
        } else {
          continue;
        }
      }
  } catch (e) {
    console.log(e)
  }
})


