const handler = require('serve-handler');
const http = require('http');

const server = http.createServer((request, response) => {
  // You can pass in the options object with the URL being the request.url
  // serve-handler will then serve the file relative to the /public directory
  return handler(request, response, {
    public: 'dist'
  });
});

server.listen(process.env.PORT || 8080, () => {
  console.log('Running at http://localhost:' + (process.env.PORT || 8080));
}); 