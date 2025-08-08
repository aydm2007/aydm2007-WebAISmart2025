import express from 'express';
import axios from 'axios';

const router = express.Router();

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

router.post('/forecast', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/forecast/`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/detect_anomalies', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/detect_anomalies/`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
