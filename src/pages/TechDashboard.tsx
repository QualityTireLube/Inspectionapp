import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Typography, Card, CardContent, CardActionArea, Chip, Divider, Button, CircularProgress } from '@mui/material';
import Grid from '../components/CustomGrid';
import { DirectionsCar as CarIcon, PlayArrow as PlayArrowIcon, Schedule as ScheduleIcon, Person as PersonIcon, Speed as SpeedIcon, Label as LabelIcon } from '@mui/icons-material';
import LabelCreator from '../components/LabelCreator';
import { useUser } from '../contexts/UserContext';
import { InspectionDocument } from '../services/firebase/inspections';
import { DraftDocument } from '../services/firebase/drafts';
import { db } from '../services/firebase/config';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

function mapDoc(d: InspectionDocument) {
  const ts = (d.createdAt as any)?.toDate ? (d.createdAt as any).toDate().toISOString() : '';
  return {
    id: d.id as any,
    firestoreId: d.id,
    user_name: d.userName ?? '',
    created_at: ts,
    updated_at: ts,
    status: d.status,
    data: {
      ...(d.data ?? {}),
      inspection_type: d.inspectionType,
      vin: d.data?.vin,
      mileage: d.data?.mileage,
      year: d.data?.year,
      make: d.data?.make,
      model: d.data?.model,
      vehicle_details: d.data?.vehicle_details,
      technician_duration: d.data?.technician_duration,
    },
  };
}

const INSPECTIONS = 'inspections';
import { GeneratedLabel } from '../types/labels';
import { LocationAwareStorageService } from '../services/locationAwareStorage';
import { GeneratedLabelStorageService } from '../services/generatedLabelStorage';

type QuickCheck = {
  id: number;
  user_name: string;
  created_at: string;
  updated_at?: string;
  status?: string;
  data: {
    vin?: string;
    mileage?: number;
    vehicle_details?: string;
    year?: string;
    make?: string;
    model?: string;
    technician_duration?: number;
    inspection_type?: string;
  };
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatDuration(seconds?: number) {
  if (!seconds && seconds !== 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}

const TechDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userLocation } = useUser();
  const [inProgressChecks, setInProgressChecks] = useState<QuickCheck[]>([]);
  const [submittedChecks, setSubmittedChecks] = useState<QuickCheck[]>([]);
  const [activeLabels, setActiveLabels] = useState<GeneratedLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLabelCreator, setShowLabelCreator] = useState(false);

  // Admins see all locations (null = all); other roles are scoped to their assigned location
  const effectiveLocation = (user?.role === 'admin' || user?.role === 'manager') ? null : userLocation;

  const reloadLabels = async () => {
    if (effectiveLocation?.id) {
      const labels = await LocationAwareStorageService.getActiveLabelsByLocation(effectiveLocation.id);
      setActiveLabels(Array.isArray(labels) ? labels : []);
    } else {
      const labels = await GeneratedLabelStorageService.getActiveGeneratedLabels();
      setActiveLabels(Array.isArray(labels) ? labels : []);
    }
  };

  useEffect(() => {
    setLoading(true);
    let loadedDrafts = false;
    let loadedSubmitted = false;

    const trySetLoaded = () => {
      if (loadedDrafts && loadedSubmitted) setLoading(false);
    };

    const submittedQ = query(
      collection(db, INSPECTIONS),
      where('status', '==', 'submitted'),
      orderBy('createdAt', 'desc')
    );

    const unsubDrafts = onSnapshot(collection(db, 'drafts'), (snap) => {
      setInProgressChecks(snap.docs.map(d => {
        const raw = d.data() as DraftDocument;
        return mapDoc({
          id: d.id,
          userId: raw.userId,
          userName: raw.userName,
          inspectionType: raw.inspectionType,
          data: raw.data,
          status: 'draft',
          createdAt: raw.lastUpdated ?? Timestamp.now(),
          updatedAt: raw.lastUpdated ?? Timestamp.now(),
        } as InspectionDocument);
      }));
      loadedDrafts = true;
      trySetLoaded();
    }, () => { loadedDrafts = true; trySetLoaded(); });

    const unsubSubmitted = onSnapshot(submittedQ, (snap) => {
      setSubmittedChecks(snap.docs.map(d => mapDoc({ id: d.id, ...d.data() } as InspectionDocument)));
      loadedSubmitted = true;
      trySetLoaded();
    }, () => { loadedSubmitted = true; trySetLoaded(); });

    reloadLabels();

    return () => {
      unsubDrafts();
      unsubSubmitted();
    };
  }, [effectiveLocation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* Inspections section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CarIcon color="primary" /> Quick Check Inspections
          </Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {/* In Progress */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PlayArrowIcon color="warning" /> In Progress ({inProgressChecks.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                  {/* Quick Check group */}
                  {inProgressChecks.some(q => (q?.data?.inspection_type || 'quick_check') === 'quick_check') && (
                    <>
                      <Typography variant="subtitle1" sx={{ mt: 1 }}>Quick Check</Typography>
                      {inProgressChecks
                        .filter(q => (q?.data?.inspection_type || 'quick_check') === 'quick_check')
                        .slice(0, 6)
                        .map((qc) => (
                          <Card key={qc.id} variant="outlined">
                            <CardActionArea onClick={() => navigate(`/quick-check?draftId=${qc.id}`)}>
                              <CardContent>
                                <Typography variant="subtitle1" noWrap sx={{ mb: 0.5 }}>
                                  {qc.data.vehicle_details || `${qc.data.year ?? ''} ${qc.data.make ?? ''} ${qc.data.model ?? ''}`.trim() || 'Vehicle'}
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, color: 'text.secondary' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CarIcon sx={{ fontSize: 18 }} />
                                    <Typography variant="body2">VIN: {qc.data.vin || 'N/A'}</Typography>
                                  </Box>
                                  {qc.data.mileage && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <SpeedIcon sx={{ fontSize: 18 }} />
                                      <Typography variant="body2">{qc.data.mileage.toLocaleString()} mi</Typography>
                                    </Box>
                                  )}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <PersonIcon sx={{ fontSize: 18 }} />
                                    <Typography variant="body2">{qc.user_name}</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <ScheduleIcon sx={{ fontSize: 18 }} />
                                    <Typography variant="body2">{formatDate(qc.created_at)}</Typography>
                                  </Box>
                                </Box>
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        ))}
                    </>
                  )}

                  {/* VSI group */}
                  {inProgressChecks.some(q => q?.data?.inspection_type === 'vsi') && (
                    <>
                      <Typography variant="subtitle1" sx={{ mt: 2 }}>VSI</Typography>
                      {inProgressChecks
                        .filter(q => q?.data?.inspection_type === 'vsi')
                        .slice(0, 6)
                        .map((qc) => (
                          <Card key={qc.id} variant="outlined">
                            <CardActionArea onClick={() => navigate(`/vsi?draftId=${qc.id}`)}>
                              <CardContent>
                                <Typography variant="subtitle1" noWrap sx={{ mb: 0.5 }}>
                                  {qc.data.vehicle_details || `${qc.data.year ?? ''} ${qc.data.make ?? ''} ${qc.data.model ?? ''}`.trim() || 'Vehicle'}
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, color: 'text.secondary' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CarIcon sx={{ fontSize: 18 }} />
                                    <Typography variant="body2">VIN: {qc.data.vin || 'N/A'}</Typography>
                                  </Box>
                                  {qc.data.mileage && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <SpeedIcon sx={{ fontSize: 18 }} />
                                      <Typography variant="body2">{qc.data.mileage.toLocaleString()} mi</Typography>
                                    </Box>
                                  )}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <PersonIcon sx={{ fontSize: 18 }} />
                                    <Typography variant="body2">{qc.user_name}</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <ScheduleIcon sx={{ fontSize: 18 }} />
                                    <Typography variant="body2">{formatDate(qc.created_at)}</Typography>
                                  </Box>
                                </Box>
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        ))}
                    </>
                  )}

                  {/* No Check group */}
                  {inProgressChecks.some(q => q?.data?.inspection_type === 'no_check') && (
                    <>
                      <Typography variant="subtitle1" sx={{ mt: 2 }}>No Check</Typography>
                      {inProgressChecks
                        .filter(q => q?.data?.inspection_type === 'no_check')
                        .slice(0, 6)
                        .map((qc) => (
                          <Card key={qc.id} variant="outlined">
                            <CardActionArea onClick={() => navigate(`/no-check?draftId=${qc.id}`)}>
                              <CardContent>
                                <Typography variant="subtitle1" noWrap sx={{ mb: 0.5 }}>
                                  {qc.data.vehicle_details || `${qc.data.year ?? ''} ${qc.data.make ?? ''} ${qc.data.model ?? ''}`.trim() || 'Vehicle'}
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, color: 'text.secondary' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CarIcon sx={{ fontSize: 18 }} />
                                    <Typography variant="body2">VIN: {qc.data.vin || 'N/A'}</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <PersonIcon sx={{ fontSize: 18 }} />
                                    <Typography variant="body2">{qc.user_name}</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <ScheduleIcon sx={{ fontSize: 18 }} />
                                    <Typography variant="body2">{formatDate(qc.created_at)}</Typography>
                                  </Box>
                                </Box>
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        ))}
                    </>
                  )}
                </Box>
              </Grid>

              {/* Submitted */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label="Submitted" color="primary" size="small" /> Completed ({submittedChecks.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                  {/* Quick Check group */}
                  {submittedChecks.some(q => (q?.data?.inspection_type || 'quick_check') === 'quick_check') && (
                    <>
                      <Typography variant="subtitle1" sx={{ mt: 1 }}>Quick Check</Typography>
                      {submittedChecks
                        .filter(q => (q?.data?.inspection_type || 'quick_check') === 'quick_check')
                        .slice(0, 6)
                        .map((qc) => (
                          <Card key={qc.id} variant="outlined">
                            <CardActionArea onClick={() => navigate(`/quick-check/${qc.firestoreId || qc.id}`)}>
                              <CardContent>
                                <Typography variant="subtitle1" noWrap sx={{ mb: 0.5 }}>
                                  {qc.data.vehicle_details || `${qc.data.year ?? ''} ${qc.data.make ?? ''} ${qc.data.model ?? ''}`.trim() || 'Vehicle'}
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, color: 'text.secondary' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CarIcon sx={{ fontSize: 18 }} />
                                    <Typography variant="body2">VIN: {qc.data.vin || 'N/A'}</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <ScheduleIcon sx={{ fontSize: 18 }} />
                                    <Typography variant="body2">{formatDate(qc.created_at)}</Typography>
                                  </Box>
                                  {typeof qc.data.technician_duration === 'number' && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <ScheduleIcon sx={{ fontSize: 18 }} />
                                      <Typography variant="body2">{formatDuration(qc.data.technician_duration)}</Typography>
                                    </Box>
                                  )}
                                </Box>
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        ))}
                    </>
                  )}

                  {/* VSI group */}
                  {submittedChecks.some(q => q?.data?.inspection_type === 'vsi') && (
                    <>
                      <Typography variant="subtitle1" sx={{ mt: 2 }}>VSI</Typography>
                      {submittedChecks
                        .filter(q => q?.data?.inspection_type === 'vsi')
                        .slice(0, 6)
                        .map((qc) => (
                          <Card key={qc.id} variant="outlined">
                            <CardActionArea onClick={() => navigate(`/quick-check/${qc.firestoreId || qc.id}`)}>
                              <CardContent>
                                <Typography variant="subtitle1" noWrap sx={{ mb: 0.5 }}>
                                  {qc.data.vehicle_details || `${qc.data.year ?? ''} ${qc.data.make ?? ''} ${qc.data.model ?? ''}`.trim() || 'Vehicle'}
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, color: 'text.secondary' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CarIcon sx={{ fontSize: 18 }} />
                                    <Typography variant="body2">VIN: {qc.data.vin || 'N/A'}</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <ScheduleIcon sx={{ fontSize: 18 }} />
                                    <Typography variant="body2">{formatDate(qc.created_at)}</Typography>
                                  </Box>
                                </Box>
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        ))}
                    </>
                  )}

                  {/* No Check group */}
                  {submittedChecks.some(q => q?.data?.inspection_type === 'no_check') && (
                    <>
                      <Typography variant="subtitle1" sx={{ mt: 2 }}>No Check</Typography>
                      {submittedChecks
                        .filter(q => q?.data?.inspection_type === 'no_check')
                        .slice(0, 6)
                        .map((qc) => (
                          <Card key={qc.id} variant="outlined">
                            <CardActionArea onClick={() => navigate(`/quick-check/${qc.firestoreId || qc.id}`)}>
                              <CardContent>
                                <Typography variant="subtitle1" noWrap sx={{ mb: 0.5 }}>
                                  {qc.data.vehicle_details || `${qc.data.year ?? ''} ${qc.data.make ?? ''} ${qc.data.model ?? ''}`.trim() || 'Vehicle'}
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, color: 'text.secondary' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CarIcon sx={{ fontSize: 18 }} />
                                    <Typography variant="body2">VIN: {qc.data.vin || 'N/A'}</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <ScheduleIcon sx={{ fontSize: 18 }} />
                                    <Typography variant="body2">{formatDate(qc.created_at)}</Typography>
                                  </Box>
                                </Box>
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        ))}
                    </>
                  )}
                </Box>
              </Grid>
            </Grid>
          )}

          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button variant="text" onClick={() => navigate('/history')}>View History</Button>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Labels section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LabelIcon color="primary" /> Labels
          </Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : activeLabels.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No active labels</Typography>
          ) : (
            <Grid container spacing={2}>
              {activeLabels.slice(0, 6).map((label) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={label.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" noWrap sx={{ mb: 0.5 }}>{label.templateName}</Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {label.createdBy} • {new Date(label.createdDate).toLocaleDateString()}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip size="small" color="info" label={`Printed ${label.printCount}x`} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button variant="contained" color="secondary" onClick={() => setShowLabelCreator(true)}>Label</Button>
            <Button variant="outlined" onClick={() => navigate('/labels')}>Open Labels</Button>
          </Box>
        </Box>

        {/* Note: Static sticker section intentionally omitted on Tech Dashboard */}

        {/* Label Creator Dialog */}
        <LabelCreator
          open={showLabelCreator}
          onClose={() => setShowLabelCreator(false)}
          onLabelCreated={async () => {
            setShowLabelCreator(false);
            await reloadLabels();
          }}
        />
      </Box>
    </Container>
  );
};

export default TechDashboard;


