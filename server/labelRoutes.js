const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

const router = express.Router();

// Database file path
const LABELS_DB_PATH = path.join(__dirname, 'labels.json');

// Initialize labels database
const initializeLabelsDB = async () => {
  try {
    await fs.access(LABELS_DB_PATH);
  } catch (error) {
    // File doesn't exist, create it
    await fs.writeFile(LABELS_DB_PATH, JSON.stringify({ templates: [] }, null, 2));
    logger.info('✅ Labels database initialized');
  }
};

// Helper functions
const readLabelsDB = async () => {
  try {
    const data = await fs.readFile(LABELS_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Error reading labels database:', error);
    return { templates: [] };
  }
};

const writeLabelsDB = async (data) => {
  try {
    await fs.writeFile(LABELS_DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    logger.error('Error writing labels database:', error);
    throw error;
  }
};

// Convert mm to pixels (assuming 96 DPI)
const mmToPixels = (mm) => Math.round((mm * 96) / 25.4);

const getPaperDimensions = (paperSize) => {
  const sizes = {
    'Brother-QL800': { width: mmToPixels(62), height: mmToPixels(29) },
    'Dymo-TwinTurbo': { width: mmToPixels(89), height: mmToPixels(36) },
    '29mmx90mm': { width: mmToPixels(90), height: mmToPixels(29) }
  };
  return sizes[paperSize] || sizes['Brother-QL800'];
};

// Routes

// GET /api/labels - Get all templates
router.get('/', async (req, res) => {
  try {
    const db = await readLabelsDB();
    const { archived } = req.query;
    
    let templates = db.templates;
    if (archived !== undefined) {
      const isArchived = archived === 'true';
      templates = templates.filter(t => t.archived === isArchived);
    }
    
    res.json(templates);
  } catch (error) {
    logger.error('Error fetching labels:', error);
    res.status(500).json({ error: 'Failed to fetch labels' });
  }
});

// GET /api/labels/:id - Get specific template
router.get('/:id', async (req, res) => {
  try {
    const db = await readLabelsDB();
    const template = db.templates.find(t => t.id === req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error) {
    logger.error('Error fetching label:', error);
    res.status(500).json({ error: 'Failed to fetch label' });
  }
});

// POST /api/labels - Create new template
router.post('/', async (req, res) => {
  try {
    const { labelName, fields, paperSize, copies, createdBy } = req.body;
    
    // Validation
    if (!labelName || !fields || !paperSize || !createdBy) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const dimensions = getPaperDimensions(paperSize);
    
    const newTemplate = {
      id: uuidv4(),
      labelName,
      fields: fields.map(field => ({
        ...field,
        id: field.id || uuidv4()
      })),
      paperSize,
      width: dimensions.width,
      height: dimensions.height,
      copies: copies || 1,
      archived: false,
      createdBy,
      createdDate: new Date().toISOString()
    };
    
    const db = await readLabelsDB();
    db.templates.push(newTemplate);
    await writeLabelsDB(db);
    
    logger.info(`✅ Created label template: ${labelName} by ${createdBy}`);
    res.status(201).json(newTemplate);
  } catch (error) {
    logger.error('Error creating label:', error);
    res.status(500).json({ error: 'Failed to create label' });
  }
});

// PUT /api/labels/:id - Update template
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const db = await readLabelsDB();
    const templateIndex = db.templates.findIndex(t => t.id === id);
    
    if (templateIndex === -1) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Update dimensions if paper size changed
    if (updates.paperSize) {
      const dimensions = getPaperDimensions(updates.paperSize);
      updates.width = dimensions.width;
      updates.height = dimensions.height;
    }
    
    db.templates[templateIndex] = {
      ...db.templates[templateIndex],
      ...updates,
      updatedDate: new Date().toISOString()
    };
    
    await writeLabelsDB(db);
    
    logger.info(`✅ Updated label template: ${id}`);
    res.json(db.templates[templateIndex]);
  } catch (error) {
    logger.error('Error updating label:', error);
    res.status(500).json({ error: 'Failed to update label' });
  }
});

// DELETE /api/labels/:id - Archive template
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    
    const db = await readLabelsDB();
    const templateIndex = db.templates.findIndex(t => t.id === id);
    
    if (templateIndex === -1) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    if (permanent === 'true') {
      // Permanently delete
      db.templates.splice(templateIndex, 1);
      logger.info(`✅ Permanently deleted label template: ${id}`);
    } else {
      // Archive
      db.templates[templateIndex].archived = true;
      db.templates[templateIndex].updatedDate = new Date().toISOString();
      logger.info(`✅ Archived label template: ${id}`);
    }
    
    await writeLabelsDB(db);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting label:', error);
    res.status(500).json({ error: 'Failed to delete label' });
  }
});

// POST /api/labels/:id/restore - Restore archived template
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = await readLabelsDB();
    const templateIndex = db.templates.findIndex(t => t.id === id);
    
    if (templateIndex === -1) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    db.templates[templateIndex].archived = false;
    db.templates[templateIndex].updatedDate = new Date().toISOString();
    
    await writeLabelsDB(db);
    
    logger.info(`✅ Restored label template: ${id}`);
    res.json(db.templates[templateIndex]);
  } catch (error) {
    logger.error('Error restoring label:', error);
    res.status(500).json({ error: 'Failed to restore label' });
  }
});

// POST /api/labels/:id/duplicate - Duplicate template
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    const { createdBy } = req.body;
    
    const db = await readLabelsDB();
    const template = db.templates.find(t => t.id === id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const duplicatedTemplate = {
      ...template,
      id: uuidv4(),
      labelName: `${template.labelName} (Copy)`,
      createdBy: createdBy || template.createdBy,
      createdDate: new Date().toISOString(),
      updatedDate: undefined,
      archived: false,
      fields: template.fields.map(field => ({
        ...field,
        id: uuidv4()
      }))
    };
    
    db.templates.push(duplicatedTemplate);
    await writeLabelsDB(db);
    
    logger.info(`✅ Duplicated label template: ${template.labelName} -> ${duplicatedTemplate.labelName}`);
    res.status(201).json(duplicatedTemplate);
  } catch (error) {
    logger.error('Error duplicating label:', error);
    res.status(500).json({ error: 'Failed to duplicate label' });
  }
});

// Initialize database on startup
initializeLabelsDB().catch(error => {
  logger.error('Failed to initialize labels database:', error);
});

module.exports = router; 