import React, { useEffect, useState } from 'react';
import { Box, Tabs, Tab, CircularProgress, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import { databaseApi } from '../services/databaseApi';

const Databases: React.FC = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTable = async (tableName: string) => {
    try {
      setLoading(true);
      const data = await databaseApi.getTableData(tableName);
      setColumns(data.columns);
      setRows(data.rows);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Error loading table');
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const tbls = await databaseApi.getTables();
        setTables(tbls);
        if (tbls.length > 0) {
          loadTable(tbls[0]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load tables');
      }
    })();
  }, []);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    const tableName = tables[newValue];
    if (tableName) {
      loadTable(tableName);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Database Viewer
      </Typography>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ mb: 2 }}
      >
        {tables.map((t) => (
          <Tab key={t} label={t} />
        ))}
      </Tabs>

      {/* === Field chips === */}
      {columns.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1 }}>
          <Chip label="Fields" variant="outlined" size="small" />
          {columns.map((col) => (
            <Chip key={col} label={col} color="primary" variant="outlined" size="small" />
          ))}
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell key={col} sx={{ fontWeight: 'bold' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx} hover>
                  {columns.map((col) => (
                    <TableCell key={col}>{String(row[col] ?? '')}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default Databases; 