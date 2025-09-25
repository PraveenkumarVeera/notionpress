import React, { useState, useCallback, useMemo } from "react";
import Papa from "papaparse";
import {
  Box,
  Button,
  LinearProgress,
  Typography,
  Stack,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import { DataGrid } from "@mui/x-data-grid";
import DownloadIcon from "@mui/icons-material/Download";

export default function CsvTableUploader() {
  const [fileName, setFileName] = useState(null);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [originalRows, setOriginalRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [headers, setHeaders] = useState([]);

  // View/Edit state
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState("view");
  const [selectedRow, setSelectedRow] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [editedRows, setEditedRows] = useState(new Set());
  const [isDirty, setIsDirty] = useState(false);

  const handleFile = useCallback((file) => {
    if (!file) return;
    setParsing(true);
    setError(null);
    setParsingProgress(0);
    setFileName(file.name || "data.csv");

    let header = null;
    let idCounter = 1;
    const parsedRows = [];

    Papa.parse(file, {
      header: false,
      worker: true,
      skipEmptyLines: true,
      chunkSize: 1024 * 1024,
      chunk: (results) => {
        const data = results.data;
        if (!header) {
          header = data.shift();
          setHeaders(header);
          const cols = header.map((h, idx) => ({
            field: String(idx),
            headerName: h || `col_${idx}`,
            flex: 1,
          }));
          // add actions column

          cols.push({
            field: "actions",
            headerName: "Actions",
            sortable: false,
            width: 120,
            renderCell: (params) => (
              <Stack direction="row" spacing={1}>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleView(params.row)}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  color="secondary"
                  onClick={() => handleEdit(params.row)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Stack>
            ),
          });
          setColumns(cols);
        }
        for (const r of data) {
          const out = {};
          for (let i = 0; i < header.length; i++) {
            out[String(i)] = r[i] ?? "";
          }
          out.id = idCounter++;
          parsedRows.push(out);
        }
        setParsingProgress((p) => Math.min(95, p + Math.random() * 10));
      },
      complete: () => {
        setRows(parsedRows);
        setOriginalRows(parsedRows);
        setParsing(false);
        setParsingProgress(100);
        setEditedRows(new Set());
        setHasChanges(false);
      },
      error: (err) => {
        setError(err.message || String(err));
        setParsing(false);
      },
    });
  }, []);

  const onFileUpload = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) handleFile(f);
    e.target.value = null;
  };

  const gridColumns = useMemo(() => {
    if (!columns.length) return [];
    return columns;
  }, [columns]);

  const handleView = (row) => {
    setSelectedRow(row);
    setDialogMode("view");
    setOpenDialog(true);
  };

  const handleEdit = (row) => {
    setSelectedRow({ ...row });
    setDialogMode("edit");
    setOpenDialog(true);
    setIsDirty(false);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setSelectedRow(null);
  };

  const handleSave = () => {
    if (dialogMode === "edit" && selectedRow) {
      setRows((prev) =>
        prev.map((r) => (r.id === selectedRow.id ? selectedRow : r))
      );
      setEditedRows((prev) => new Set(prev).add(selectedRow.id));
      setHasChanges(true);
    }
    handleDialogClose();
  };

  const handleDownload = () => {
    if (!rows.length) return;

    // convert rows back to CSV
    const csvRows = [];
    csvRows.push(headers.join(","));
    for (const r of rows) {
      const rowArr = headers.map((_, idx) => r[String(idx)] || "");
      csvRows.push(rowArr.join(","));
    }

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName || "edited.csv";
    link.click();

    setHasChanges(false);
  };

  const handleReset = () => {
    alert("All changes will be lost. Are you sure?");
    setRows(originalRows);
    setEditedRows(new Set());
    setHasChanges(false);
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Paper
        sx={{
          p: { xs: 1, sm: 2 },
          mb: 2,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", md: "center" },
          gap: 2,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
          flexWrap="wrap"
        >
          <label htmlFor="csvInput">
            <input
              id="csvInput"
              type="file"
              accept=".csv,text/csv"
              onChange={onFileUpload}
              style={{ display: "none" }}
            />
            <Button
              variant="contained"
              component="span"
              startIcon={<UploadFileIcon />}
              fullWidth={true}
            >
              Upload CSV File
            </Button>
          </label>

          <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
            {fileName || "No file selected"}
          </Typography>

          {parsing && (
            <Box sx={{ width: 200,mt: { xs: 1, sm: 1,md:1 } }}>
              <LinearProgress variant="determinate" value={parsingProgress} />
              <Typography variant="caption">
                Parsing... {Math.round(parsingProgress)}%
              </Typography>
            </Box>
          )}

          {!parsing && rows.length > 0 && (
            <Typography variant="body2" color="success.main">
              Loaded {rows.length.toLocaleString()} rows
            </Typography>
          )}

          {error && <Typography color="error">Error: {error}</Typography>}
        </Stack>

        {hasChanges && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" sx={{ mt: { xs: 2, md: 0 } }}>
            <Button
              variant="outlined"
              color="success"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              fullWidth={true}
            >
              Download Edited CSV
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={handleReset}
              fullWidth={true}
            >
              Reset All Edits
            </Button>
          </Stack>
        )}
      </Paper>

      {rows.length > 0 && (
        <Paper sx={{ height: { xs: 400, md: 600 }, width: "100%",overflow: "auto", }}>
          <DataGrid
            rows={rows}
            columns={gridColumns}
            pagination
            pageSize={100}
            rowsPerPageOptions={[25, 50, 100, 250]}
            getRowClassName={(params) =>
              editedRows.has(params.id) ? "edited-row" : ""
            }
            sx={{
              "& .MuiDataGrid-columnHeaders": {
                borderBottom: "1px solid #ccc",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: "bold",
                fontSize: { xs: 13, sm: 15 },
              },
            }}
          />
        </Paper>
      )}

      <Dialog
        open={openDialog}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
        fullScreen={{ xs: true, sm: false }}
      >
        <DialogTitle>
          {dialogMode === "view" ? "Book Detail" : "Edit Book"}
          <IconButton
            aria-label="close"
            onClick={handleDialogClose}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedRow &&
            columns
              .filter((c) => c.field !== "id" && c.field !== "actions")
              .map((col) => (
                <Box key={col.field} sx={{ mb: 2 }}>
                  {dialogMode === "view" ? (
                    <Typography variant="body2">
                      <b>{col.headerName}:</b> {selectedRow[col.field] || ""}
                    </Typography>
                  ) : (
                    <TextField
                      fullWidth
                      label={col.headerName}
                      value={selectedRow[col.field] || ""}
                      onChange={(e) => {
                        setSelectedRow((prev) => {
                          const updated = {
                            ...prev,
                            [col.field]: e.target.value,
                          };
                          // check if row differs from original
                          const originalRow = rows.find(
                            (r) => r.id === prev.id
                          );
                          const dirty = Object.keys(updated).some(
                            (key) => updated[key] !== originalRow[key]
                          );
                          setIsDirty(dirty);
                          return updated;
                        });
                      }}
                    />
                  )}
                </Box>
              ))}
        </DialogContent>
        <DialogActions>
          {dialogMode === "edit" && (
            <Button
              onClick={handleSave}
              variant="contained"
              color="primary"
              disabled={!isDirty}
            >
              Save
            </Button>
          )}
          <Button onClick={handleDialogClose} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Highlight style */}
      <style>
        {`
          .edited-row {
            background-color: #fff7e6 !important; /* light orange highlight */
          }
        `}
      </style>
    </Box>
  );
}
