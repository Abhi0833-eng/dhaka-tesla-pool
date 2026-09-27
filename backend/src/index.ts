import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚗⚡ Dhaka Tesla Pool Backend Server listening on port ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
});
