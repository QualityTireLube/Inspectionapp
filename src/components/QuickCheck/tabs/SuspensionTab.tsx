import React from 'react';
import {
  Typography,
  TextField,
  Button,
  Box,
  Stack,
  Chip,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  Info as InfoIcon
} from '@mui/icons-material';
import {
  QuickCheckForm,
  ImageUpload,
  PhotoType
} from '../../../types/quickCheck';
import NotesField from './NotesField';
import { SafariImageUpload } from '../../Image';

interface SuspensionTabProps {
  form: QuickCheckForm;
  loading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRadioChange: (name: string, value: string) => void;
  onImageUpload: (file: File, type: PhotoType) => Promise<void>;
  onImageClick: (photos: ImageUpload[], photoType?: string) => void;
  onInfoClick: (event: React.MouseEvent<HTMLElement>, content: string) => void;
  onFieldNotesChange: (fieldName: string, noteText: string) => void;
  onDeleteImage: (photoType: string, index: number) => void;
  enabledFields?: readonly string[];
}

export const SuspensionTab: React.FC<SuspensionTabProps> = ({
  form,
  loading,
  onChange,
  onRadioChange,
  onImageUpload,
  onImageClick,
  onInfoClick,
  onFieldNotesChange,
  onDeleteImage,
  enabledFields
}) => {
  const isEnabled = (k: string) => !enabledFields || enabledFields.includes(k);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      
      {/* Front Suspension Section Header */}
      <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 'bold' }}>
        Front Suspension
      </Typography>

      {/* Left Control Arm Bushings */}
      {isEnabled('left_control_arm_bushings') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="left_control_arm_bushings_photos"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Left Control Arm Bushings
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="left_control_arm_bushings_photos"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="left_control_arm_bushings"
              fieldLabel="Left Control Arm Bushings"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Inspect left control arm bushings for wear, cracking, or damage.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="✅ Good"
            clickable
            variant={form.left_control_arm_bushings?.includes('good') ? 'filled' : 'outlined'}
            color={form.left_control_arm_bushings?.includes('good') ? 'success' : 'default'}
            onClick={() => {
              const current = form.left_control_arm_bushings || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('good') ? values.filter(v => v !== 'good') : [...values, 'good'];
              onRadioChange('left_control_arm_bushings', next.join(','));
            }}
          />
          <Chip
            label="❌ Bad"
            clickable
            variant={form.left_control_arm_bushings?.includes('bad') ? 'filled' : 'outlined'}
            color={form.left_control_arm_bushings?.includes('bad') ? 'error' : 'default'}
            onClick={() => {
              const current = form.left_control_arm_bushings || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('bad') ? values.filter(v => v !== 'bad') : [...values, 'bad'];
              onRadioChange('left_control_arm_bushings', next.join(','));
            }}
          />
          <Chip
            label="Upper"
            clickable
            variant={form.left_control_arm_bushings?.includes('upper') ? 'filled' : 'outlined'}
            color={form.left_control_arm_bushings?.includes('upper') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.left_control_arm_bushings || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('upper') ? values.filter(v => v !== 'upper') : [...values, 'upper'];
              onRadioChange('left_control_arm_bushings', next.join(','));
            }}
          />
          <Chip
            label="Lower"
            clickable
            variant={form.left_control_arm_bushings?.includes('lower') ? 'filled' : 'outlined'}
            color={form.left_control_arm_bushings?.includes('lower') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.left_control_arm_bushings || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('lower') ? values.filter(v => v !== 'lower') : [...values, 'lower'];
              onRadioChange('left_control_arm_bushings', next.join(','));
            }}
          />
          <Chip
            label="Frontward"
            clickable
            variant={form.left_control_arm_bushings?.includes('frontward') ? 'filled' : 'outlined'}
            color={form.left_control_arm_bushings?.includes('frontward') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.left_control_arm_bushings || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('frontward') ? values.filter(v => v !== 'frontward') : [...values, 'frontward'];
              onRadioChange('left_control_arm_bushings', next.join(','));
            }}
          />
          <Chip
            label="Rearward"
            clickable
            variant={form.left_control_arm_bushings?.includes('rearward') ? 'filled' : 'outlined'}
            color={form.left_control_arm_bushings?.includes('rearward') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.left_control_arm_bushings || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('rearward') ? values.filter(v => v !== 'rearward') : [...values, 'rearward'];
              onRadioChange('left_control_arm_bushings', next.join(','));
            }}
          />
        </Box>
      </Box>
      )}

      {/* Left Ball Joints */}
      {isEnabled('left_ball_joints') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="left_ball_joints_photos"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Left Ball Joints
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="left_ball_joints_photos"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="left_ball_joints"
              fieldLabel="Left Ball Joints"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Check left ball joints for play, wear, or damage.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="✅ Good"
            clickable
            variant={form.left_ball_joints?.includes('good') ? 'filled' : 'outlined'}
            color={form.left_ball_joints?.includes('good') ? 'success' : 'default'}
            onClick={() => {
              const current = form.left_ball_joints || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('good') ? values.filter(v => v !== 'good') : [...values, 'good'];
              onRadioChange('left_ball_joints', next.join(','));
            }}
          />
          <Chip
            label="⚠️ Warning"
            clickable
            variant={form.left_ball_joints?.includes('warning') ? 'filled' : 'outlined'}
            color={form.left_ball_joints?.includes('warning') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.left_ball_joints || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('warning') ? values.filter(v => v !== 'warning') : [...values, 'warning'];
              onRadioChange('left_ball_joints', next.join(','));
            }}
          />
          <Chip
            label="❌ Bad"
            clickable
            variant={form.left_ball_joints?.includes('bad') ? 'filled' : 'outlined'}
            color={form.left_ball_joints?.includes('bad') ? 'error' : 'default'}
            onClick={() => {
              const current = form.left_ball_joints || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('bad') ? values.filter(v => v !== 'bad') : [...values, 'bad'];
              onRadioChange('left_ball_joints', next.join(','));
            }}
          />
          <Chip
            label="Upper"
            clickable
            variant={form.left_ball_joints?.includes('upper') ? 'filled' : 'outlined'}
            color={form.left_ball_joints?.includes('upper') ? 'info' : 'default'}
            onClick={() => {
              const current = form.left_ball_joints || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('upper') ? values.filter(v => v !== 'upper') : [...values, 'upper'];
              onRadioChange('left_ball_joints', next.join(','));
            }}
          />
          <Chip
            label="Lower"
            clickable
            variant={form.left_ball_joints?.includes('lower') ? 'filled' : 'outlined'}
            color={form.left_ball_joints?.includes('lower') ? 'info' : 'default'}
            onClick={() => {
              const current = form.left_ball_joints || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('lower') ? values.filter(v => v !== 'lower') : [...values, 'lower'];
              onRadioChange('left_ball_joints', next.join(','));
            }}
          />
        </Box>
      </Box>
      )}

      {/* Right Control Arm Bushings */}
      {isEnabled('right_control_arm_bushings') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="right_control_arm_bushings_photos"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Right Control Arm Bushings
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="right_control_arm_bushings_photos"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="right_control_arm_bushings"
              fieldLabel="Right Control Arm Bushings"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Inspect right control arm bushings for wear, cracking, or damage.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="✅ Good"
            clickable
            variant={form.right_control_arm_bushings?.includes('good') ? 'filled' : 'outlined'}
            color={form.right_control_arm_bushings?.includes('good') ? 'success' : 'default'}
            onClick={() => {
              const current = form.right_control_arm_bushings || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('good') ? values.filter(v => v !== 'good') : [...values, 'good'];
              onRadioChange('right_control_arm_bushings', next.join(','));
            }}
          />
          <Chip
            label="❌ Bad"
            clickable
            variant={form.right_control_arm_bushings?.includes('bad') ? 'filled' : 'outlined'}
            color={form.right_control_arm_bushings?.includes('bad') ? 'error' : 'default'}
            onClick={() => {
              const current = form.right_control_arm_bushings || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('bad') ? values.filter(v => v !== 'bad') : [...values, 'bad'];
              onRadioChange('right_control_arm_bushings', next.join(','));
            }}
          />
          <Chip
            label="Upper"
            clickable
            variant={form.right_control_arm_bushings?.includes('upper') ? 'filled' : 'outlined'}
            color={form.right_control_arm_bushings?.includes('upper') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.right_control_arm_bushings || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('upper') ? values.filter(v => v !== 'upper') : [...values, 'upper'];
              onRadioChange('right_control_arm_bushings', next.join(','));
            }}
          />
          <Chip
            label="Lower"
            clickable
            variant={form.right_control_arm_bushings?.includes('lower') ? 'filled' : 'outlined'}
            color={form.right_control_arm_bushings?.includes('lower') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.right_control_arm_bushings || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('lower') ? values.filter(v => v !== 'lower') : [...values, 'lower'];
              onRadioChange('right_control_arm_bushings', next.join(','));
            }}
          />
          <Chip
            label="Frontward"
            clickable
            variant={form.right_control_arm_bushings?.includes('frontward') ? 'filled' : 'outlined'}
            color={form.right_control_arm_bushings?.includes('frontward') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.right_control_arm_bushings || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('frontward') ? values.filter(v => v !== 'frontward') : [...values, 'frontward'];
              onRadioChange('right_control_arm_bushings', next.join(','));
            }}
          />
          <Chip
            label="Rearward"
            clickable
            variant={form.right_control_arm_bushings?.includes('rearward') ? 'filled' : 'outlined'}
            color={form.right_control_arm_bushings?.includes('rearward') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.right_control_arm_bushings || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('rearward') ? values.filter(v => v !== 'rearward') : [...values, 'rearward'];
              onRadioChange('right_control_arm_bushings', next.join(','));
            }}
          />
        </Box>
      </Box>
      )}

      {/* Right Ball Joints */}
      {isEnabled('right_ball_joints') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="right_ball_joints_photos"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Right Ball Joints
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="right_ball_joints_photos"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="right_ball_joints"
              fieldLabel="Right Ball Joints"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Check right ball joints for play, wear, or damage.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="✅ Good"
            clickable
            variant={form.right_ball_joints?.includes('good') ? 'filled' : 'outlined'}
            color={form.right_ball_joints?.includes('good') ? 'success' : 'default'}
            onClick={() => {
              const current = form.right_ball_joints || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('good') ? values.filter(v => v !== 'good') : [...values, 'good'];
              onRadioChange('right_ball_joints', next.join(','));
            }}
          />
          <Chip
            label="⚠️ Warning"
            clickable
            variant={form.right_ball_joints?.includes('warning') ? 'filled' : 'outlined'}
            color={form.right_ball_joints?.includes('warning') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.right_ball_joints || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('warning') ? values.filter(v => v !== 'warning') : [...values, 'warning'];
              onRadioChange('right_ball_joints', next.join(','));
            }}
          />
          <Chip
            label="❌ Bad"
            clickable
            variant={form.right_ball_joints?.includes('bad') ? 'filled' : 'outlined'}
            color={form.right_ball_joints?.includes('bad') ? 'error' : 'default'}
            onClick={() => {
              const current = form.right_ball_joints || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('bad') ? values.filter(v => v !== 'bad') : [...values, 'bad'];
              onRadioChange('right_ball_joints', next.join(','));
            }}
          />
          <Chip
            label="Upper"
            clickable
            variant={form.right_ball_joints?.includes('upper') ? 'filled' : 'outlined'}
            color={form.right_ball_joints?.includes('upper') ? 'info' : 'default'}
            onClick={() => {
              const current = form.right_ball_joints || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('upper') ? values.filter(v => v !== 'upper') : [...values, 'upper'];
              onRadioChange('right_ball_joints', next.join(','));
            }}
          />
          <Chip
            label="Lower"
            clickable
            variant={form.right_ball_joints?.includes('lower') ? 'filled' : 'outlined'}
            color={form.right_ball_joints?.includes('lower') ? 'info' : 'default'}
            onClick={() => {
              const current = form.right_ball_joints || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('lower') ? values.filter(v => v !== 'lower') : [...values, 'lower'];
              onRadioChange('right_ball_joints', next.join(','));
            }}
          />
        </Box>
      </Box>
      )}

      {/* Sway Bar */}
      {isEnabled('sway_bar') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="sway_bar_photos"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Sway Bar
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="sway_bar_photos"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="sway_bar"
              fieldLabel="Sway Bar"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Inspect sway bar links and bushings for wear or damage.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="✅ Good"
            clickable
            variant={form.sway_bar?.includes('good') ? 'filled' : 'outlined'}
            color={form.sway_bar?.includes('good') ? 'success' : 'default'}
            onClick={() => {
              const current = form.sway_bar || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('good') ? values.filter(v => v !== 'good') : [...values, 'good'];
              onRadioChange('sway_bar', next.join(','));
            }}
          />
          <Chip
            label="❌ Bad"
            clickable
            variant={form.sway_bar?.includes('bad') ? 'filled' : 'outlined'}
            color={form.sway_bar?.includes('bad') ? 'error' : 'default'}
            onClick={() => {
              const current = form.sway_bar || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('bad') ? values.filter(v => v !== 'bad') : [...values, 'bad'];
              onRadioChange('sway_bar', next.join(','));
            }}
          />
          <Chip
            label="F/Links"
            clickable
            variant={form.sway_bar?.includes('f_links') ? 'filled' : 'outlined'}
            color={form.sway_bar?.includes('f_links') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.sway_bar || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('f_links') ? values.filter(v => v !== 'f_links') : [...values, 'f_links'];
              onRadioChange('sway_bar', next.join(','));
            }}
          />
          <Chip
            label="F/Bushings"
            clickable
            variant={form.sway_bar?.includes('f_bushings') ? 'filled' : 'outlined'}
            color={form.sway_bar?.includes('f_bushings') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.sway_bar || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('f_bushings') ? values.filter(v => v !== 'f_bushings') : [...values, 'f_bushings'];
              onRadioChange('sway_bar', next.join(','));
            }}
          />
          <Chip
            label="R/Links"
            clickable
            variant={form.sway_bar?.includes('r_links') ? 'filled' : 'outlined'}
            color={form.sway_bar?.includes('r_links') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.sway_bar || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('r_links') ? values.filter(v => v !== 'r_links') : [...values, 'r_links'];
              onRadioChange('sway_bar', next.join(','));
            }}
          />
          <Chip
            label="R/Bushings"
            clickable
            variant={form.sway_bar?.includes('r_bushings') ? 'filled' : 'outlined'}
            color={form.sway_bar?.includes('r_bushings') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.sway_bar || '';
              const values = current ? current.split(',') : [];
              const next = values.includes('r_bushings') ? values.filter(v => v !== 'r_bushings') : [...values, 'r_bushings'];
              onRadioChange('sway_bar', next.join(','));
            }}
          />
        </Box>
      </Box>
      )}

      {/* Suspension Type */}
      {isEnabled('suspension_type') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <SafariImageUpload
            onImageUpload={onImageUpload}
            uploadType="suspension_type_photos"
            disabled={loading}
            multiple={true}
            size="small"
            resize1080p={true}
            showCameraButton={true}
            showGalleryButton={false}
          />
          <Typography variant="body1" sx={{ flexGrow: 1, ml: 1 }}>
            Suspension Type
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="suspension_type_photos"
              disabled={loading}
              multiple={true}
              size="small"
              resize1080p={true}
              showCameraButton={false}
              showGalleryButton={true}
            />
            <NotesField
              fieldName="suspension_type"
              fieldLabel="Suspension Type"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Identify suspension type and inspect steering components.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="✅ Good"
            clickable
            variant={form.suspension_type === 'good' ? 'filled' : 'outlined'}
            color={form.suspension_type === 'good' ? 'success' : 'default'}
            onClick={() => onRadioChange('suspension_type', 'good')}
          />
          <Chip
            label="Gear Box"
            clickable
            variant={form.suspension_type === 'gear_box' ? 'filled' : 'outlined'}
            color={form.suspension_type === 'gear_box' ? 'info' : 'default'}
            onClick={() => onRadioChange('suspension_type', 'gear_box')}
          />
          <Chip
            label="Rack & Pinion"
            clickable
            variant={form.suspension_type === 'rack_pinion' ? 'filled' : 'outlined'}
            color={form.suspension_type === 'rack_pinion' ? 'info' : 'default'}
            onClick={() => onRadioChange('suspension_type', 'rack_pinion')}
          />
        </Box>

        {/* Dependent dropdowns for Gear Box */}
        {form.suspension_type === 'gear_box' && (
          <Box sx={{ mt: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
              Gear Box Components:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label="L/Outer"
                clickable
                variant={form.gear_box_component?.includes('l_outer') ? 'filled' : 'outlined'}
                color={form.gear_box_component?.includes('l_outer') ? 'warning' : 'default'}
                onClick={() => {
                  const current = form.gear_box_component || '';
                  const values = current ? current.split(',') : [];
                  const next = values.includes('l_outer') ? values.filter(v => v !== 'l_outer') : [...values, 'l_outer'];
                  onRadioChange('gear_box_component', next.join(','));
                }}
              />
              <Chip
                label="L/Inner"
                clickable
                variant={form.gear_box_component?.includes('l_inner') ? 'filled' : 'outlined'}
                color={form.gear_box_component?.includes('l_inner') ? 'warning' : 'default'}
                onClick={() => {
                  const current = form.gear_box_component || '';
                  const values = current ? current.split(',') : [];
                  const next = values.includes('l_inner') ? values.filter(v => v !== 'l_inner') : [...values, 'l_inner'];
                  onRadioChange('gear_box_component', next.join(','));
                }}
              />
              <Chip
                label="Pitman Arm"
                clickable
                variant={form.gear_box_component?.includes('pitman_arm') ? 'filled' : 'outlined'}
                color={form.gear_box_component?.includes('pitman_arm') ? 'warning' : 'default'}
                onClick={() => {
                  const current = form.gear_box_component || '';
                  const values = current ? current.split(',') : [];
                  const next = values.includes('pitman_arm') ? values.filter(v => v !== 'pitman_arm') : [...values, 'pitman_arm'];
                  onRadioChange('gear_box_component', next.join(','));
                }}
              />
              <Chip
                label="Center Link"
                clickable
                variant={form.gear_box_component?.includes('center_link') ? 'filled' : 'outlined'}
                color={form.gear_box_component?.includes('center_link') ? 'warning' : 'default'}
                onClick={() => {
                  const current = form.gear_box_component || '';
                  const values = current ? current.split(',') : [];
                  const next = values.includes('center_link') ? values.filter(v => v !== 'center_link') : [...values, 'center_link'];
                  onRadioChange('gear_box_component', next.join(','));
                }}
              />
              <Chip
                label="Track Bar Joint"
                clickable
                variant={form.gear_box_component?.includes('track_bar_joint') ? 'filled' : 'outlined'}
                color={form.gear_box_component?.includes('track_bar_joint') ? 'warning' : 'default'}
                onClick={() => {
                  const current = form.gear_box_component || '';
                  const values = current ? current.split(',') : [];
                  const next = values.includes('track_bar_joint') ? values.filter(v => v !== 'track_bar_joint') : [...values, 'track_bar_joint'];
                  onRadioChange('gear_box_component', next.join(','));
                }}
              />
              <Chip
                label="Idler Arm"
                clickable
                variant={form.gear_box_component?.includes('idler_arm') ? 'filled' : 'outlined'}
                color={form.gear_box_component?.includes('idler_arm') ? 'warning' : 'default'}
                onClick={() => {
                  const current = form.gear_box_component || '';
                  const values = current ? current.split(',') : [];
                  const next = values.includes('idler_arm') ? values.filter(v => v !== 'idler_arm') : [...values, 'idler_arm'];
                  onRadioChange('gear_box_component', next.join(','));
                }}
              />
              <Chip
                label="R/Inner"
                clickable
                variant={form.gear_box_component?.includes('r_inner') ? 'filled' : 'outlined'}
                color={form.gear_box_component?.includes('r_inner') ? 'warning' : 'default'}
                onClick={() => {
                  const current = form.gear_box_component || '';
                  const values = current ? current.split(',') : [];
                  const next = values.includes('r_inner') ? values.filter(v => v !== 'r_inner') : [...values, 'r_inner'];
                  onRadioChange('gear_box_component', next.join(','));
                }}
              />
              <Chip
                label="R/Outer"
                clickable
                variant={form.gear_box_component?.includes('r_outer') ? 'filled' : 'outlined'}
                color={form.gear_box_component?.includes('r_outer') ? 'warning' : 'default'}
                onClick={() => {
                  const current = form.gear_box_component || '';
                  const values = current ? current.split(',') : [];
                  const next = values.includes('r_outer') ? values.filter(v => v !== 'r_outer') : [...values, 'r_outer'];
                  onRadioChange('gear_box_component', next.join(','));
                }}
              />
            </Box>
          </Box>
        )}

        {/* Dependent dropdowns for Rack & Pinion */}
        {form.suspension_type === 'rack_pinion' && (
          <Box sx={{ mt: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
              Rack & Pinion Components:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label="L/Outer"
                clickable
                variant={form.rack_pinion_component?.includes('l_outer') ? 'filled' : 'outlined'}
                color={form.rack_pinion_component?.includes('l_outer') ? 'warning' : 'default'}
                onClick={() => {
                  const current = form.rack_pinion_component || '';
                  const values = current ? current.split(',') : [];
                  const next = values.includes('l_outer') ? values.filter(v => v !== 'l_outer') : [...values, 'l_outer'];
                  onRadioChange('rack_pinion_component', next.join(','));
                }}
              />
              <Chip
                label="L/Inner"
                clickable
                variant={form.rack_pinion_component?.includes('l_inner') ? 'filled' : 'outlined'}
                color={form.rack_pinion_component?.includes('l_inner') ? 'warning' : 'default'}
                onClick={() => {
                  const current = form.rack_pinion_component || '';
                  const values = current ? current.split(',') : [];
                  const next = values.includes('l_inner') ? values.filter(v => v !== 'l_inner') : [...values, 'l_inner'];
                  onRadioChange('rack_pinion_component', next.join(','));
                }}
              />
              <Chip
                label="R/Inner"
                clickable
                variant={form.rack_pinion_component?.includes('r_inner') ? 'filled' : 'outlined'}
                color={form.rack_pinion_component?.includes('r_inner') ? 'warning' : 'default'}
                onClick={() => {
                  const current = form.rack_pinion_component || '';
                  const values = current ? current.split(',') : [];
                  const next = values.includes('r_inner') ? values.filter(v => v !== 'r_inner') : [...values, 'r_inner'];
                  onRadioChange('rack_pinion_component', next.join(','));
                }}
              />
              <Chip
                label="R/Outer"
                clickable
                variant={form.rack_pinion_component?.includes('r_outer') ? 'filled' : 'outlined'}
                color={form.rack_pinion_component?.includes('r_outer') ? 'warning' : 'default'}
                onClick={() => {
                  const current = form.rack_pinion_component || '';
                  const values = current ? current.split(',') : [];
                  const next = values.includes('r_outer') ? values.filter(v => v !== 'r_outer') : [...values, 'r_outer'];
                  onRadioChange('rack_pinion_component', next.join(','));
                }}
              />
            </Box>
          </Box>
        )}
      </Box>
      )}

      {/* Wheel Bearing */}
      {isEnabled('wheel_bearing') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body1" sx={{ flexGrow: 1 }}>
            Wheel Bearing
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <NotesField
              fieldName="wheel_bearing"
              fieldLabel="Wheel Bearing"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Check wheel bearings for play or noise. Comments: ✅ Good / ❌ Bad")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="F/Left"
            clickable
            variant={form.wheel_bearing?.includes('f_left') ? 'filled' : 'outlined'}
            color={form.wheel_bearing?.includes('f_left') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.wheel_bearing || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('f_left') 
                ? values.filter(v => v !== 'f_left')
                : [...values, 'f_left'];
              onRadioChange('wheel_bearing', newValues.join(','));
            }}
          />
          <Chip
            label="F/Right"
            clickable
            variant={form.wheel_bearing?.includes('f_right') ? 'filled' : 'outlined'}
            color={form.wheel_bearing?.includes('f_right') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.wheel_bearing || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('f_right') 
                ? values.filter(v => v !== 'f_right')
                : [...values, 'f_right'];
              onRadioChange('wheel_bearing', newValues.join(','));
            }}
          />
          <Chip
            label="R/Right"
            clickable
            variant={form.wheel_bearing?.includes('r_right') ? 'filled' : 'outlined'}
            color={form.wheel_bearing?.includes('r_right') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.wheel_bearing || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('r_right') 
                ? values.filter(v => v !== 'r_right')
                : [...values, 'r_right'];
              onRadioChange('wheel_bearing', newValues.join(','));
            }}
          />
          <Chip
            label="R/Left"
            clickable
            variant={form.wheel_bearing?.includes('r_left') ? 'filled' : 'outlined'}
            color={form.wheel_bearing?.includes('r_left') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.wheel_bearing || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('r_left') 
                ? values.filter(v => v !== 'r_left')
                : [...values, 'r_left'];
              onRadioChange('wheel_bearing', newValues.join(','));
            }}
          />
        </Box>

        {/* Wheel Bearing Comments */}
        {form.wheel_bearing && (
          <Box sx={{ mt: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
              Selected Wheel Bearings ({form.wheel_bearing.split(',').map(pos => pos.replace('_', '/').toUpperCase()).join(', ')}) Condition:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label="✅ Good"
                clickable
                variant={form.wheel_bearing_condition === 'good' ? 'filled' : 'outlined'}
                color={form.wheel_bearing_condition === 'good' ? 'success' : 'default'}
                onClick={() => onRadioChange('wheel_bearing_condition', 'good')}
              />
              <Chip
                label="❌ Bad"
                clickable
                variant={form.wheel_bearing_condition === 'bad' ? 'filled' : 'outlined'}
                color={form.wheel_bearing_condition === 'bad' ? 'error' : 'default'}
                onClick={() => onRadioChange('wheel_bearing_condition', 'bad')}
              />
            </Box>
          </Box>
        )}
      </Box>
      )}

      {/* CV Axles */}
      {isEnabled('cv_axles') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body1" sx={{ flexGrow: 1 }}>
            CV Axles
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <NotesField
              fieldName="cv_axles"
              fieldLabel="CV Axles"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Inspect CV axles and boots. Comments: ✅ Good / ❌ Bad / Torn / Leaking / Clicking")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="F/Left"
            clickable
            variant={form.cv_axles?.includes('f_left') ? 'filled' : 'outlined'}
            color={form.cv_axles?.includes('f_left') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.cv_axles || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('f_left') 
                ? values.filter(v => v !== 'f_left')
                : [...values, 'f_left'];
              onRadioChange('cv_axles', newValues.join(','));
            }}
          />
          <Chip
            label="F/Right"
            clickable
            variant={form.cv_axles?.includes('f_right') ? 'filled' : 'outlined'}
            color={form.cv_axles?.includes('f_right') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.cv_axles || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('f_right') 
                ? values.filter(v => v !== 'f_right')
                : [...values, 'f_right'];
              onRadioChange('cv_axles', newValues.join(','));
            }}
          />
          <Chip
            label="R/Right"
            clickable
            variant={form.cv_axles?.includes('r_right') ? 'filled' : 'outlined'}
            color={form.cv_axles?.includes('r_right') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.cv_axles || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('r_right') 
                ? values.filter(v => v !== 'r_right')
                : [...values, 'r_right'];
              onRadioChange('cv_axles', newValues.join(','));
            }}
          />
          <Chip
            label="R/Left"
            clickable
            variant={form.cv_axles?.includes('r_left') ? 'filled' : 'outlined'}
            color={form.cv_axles?.includes('r_left') ? 'warning' : 'default'}
            onClick={() => {
              const current = form.cv_axles || '';
              const values = current ? current.split(',') : [];
              const newValues = values.includes('r_left') 
                ? values.filter(v => v !== 'r_left')
                : [...values, 'r_left'];
              onRadioChange('cv_axles', newValues.join(','));
            }}
          />
        </Box>

        {/* CV Axle Comments */}
        {form.cv_axles && (
          <Box sx={{ mt: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
              Selected CV Axles ({form.cv_axles.split(',').map(pos => pos.replace('_', '/').toUpperCase()).join(', ')}) Condition:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label="✅ Good"
                clickable
                variant={form.cv_axle_condition === 'good' ? 'filled' : 'outlined'}
                color={form.cv_axle_condition === 'good' ? 'success' : 'default'}
                onClick={() => onRadioChange('cv_axle_condition', 'good')}
              />
              <Chip
                label="❌ Bad"
                clickable
                variant={form.cv_axle_condition === 'bad' ? 'filled' : 'outlined'}
                color={form.cv_axle_condition === 'bad' ? 'error' : 'default'}
                onClick={() => onRadioChange('cv_axle_condition', 'bad')}
              />
              <Chip
                label="Torn"
                clickable
                variant={form.cv_axle_condition === 'torn' ? 'filled' : 'outlined'}
                color={form.cv_axle_condition === 'torn' ? 'error' : 'default'}
                onClick={() => onRadioChange('cv_axle_condition', 'torn')}
              />
              <Chip
                label="Leaking"
                clickable
                variant={form.cv_axle_condition === 'leaking' ? 'filled' : 'outlined'}
                color={form.cv_axle_condition === 'leaking' ? 'warning' : 'default'}
                onClick={() => onRadioChange('cv_axle_condition', 'leaking')}
              />
              <Chip
                label="Clicking"
                clickable
                variant={form.cv_axle_condition === 'clicking' ? 'filled' : 'outlined'}
                color={form.cv_axle_condition === 'clicking' ? 'warning' : 'default'}
                onClick={() => onRadioChange('cv_axle_condition', 'clicking')}
              />
            </Box>
          </Box>
        )}
      </Box>
      )}

      {/* Rear Suspension Section Header */}
      <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 'bold' }}>
        Rear Suspension
      </Typography>

      {/* Rear Suspension */}
      {isEnabled('rear_suspension') && (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body1" sx={{ flexGrow: 1 }}>
            Rear Suspension
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <NotesField
              fieldName="rear_suspension"
              fieldLabel="Rear Suspension"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Check if rear suspension components need inspection.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="Yes"
            clickable
            variant={form.rear_suspension === 'yes' ? 'filled' : 'outlined'}
            color={form.rear_suspension === 'yes' ? 'warning' : 'default'}
            onClick={() => onRadioChange('rear_suspension', 'yes')}
          />
          <Chip
            label="No"
            clickable
            variant={form.rear_suspension === 'no' ? 'filled' : 'outlined'}
            color={form.rear_suspension === 'no' ? 'success' : 'default'}
            onClick={() => onRadioChange('rear_suspension', 'no')}
          />
        </Box>

        {/* Rear Suspension Details - Show if Yes */}
        {form.rear_suspension === 'yes' && (
          <Box sx={{ mt: 3 }}>
            {/* Driver Rear */}
            <Box sx={{ mt: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                Driver Rear Components:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label="Frontward Control Arm"
                  clickable
                  variant={form.driver_rear_component?.includes('frontward_control_arm') ? 'filled' : 'outlined'}
                  color={form.driver_rear_component?.includes('frontward_control_arm') ? 'warning' : 'default'}
                  onClick={() => {
                    const current = form.driver_rear_component || '';
                    const values = current ? current.split(',') : [];
                    const next = values.includes('frontward_control_arm') ? values.filter(v => v !== 'frontward_control_arm') : [...values, 'frontward_control_arm'];
                    onRadioChange('driver_rear_component', next.join(','));
                  }}
                />
                <Chip
                  label="Rearward Control Arm"
                  clickable
                  variant={form.driver_rear_component?.includes('rearward_control_arm') ? 'filled' : 'outlined'}
                  color={form.driver_rear_component?.includes('rearward_control_arm') ? 'warning' : 'default'}
                  onClick={() => {
                    const current = form.driver_rear_component || '';
                    const values = current ? current.split(',') : [];
                    const next = values.includes('rearward_control_arm') ? values.filter(v => v !== 'rearward_control_arm') : [...values, 'rearward_control_arm'];
                    onRadioChange('driver_rear_component', next.join(','));
                  }}
                />
                <Chip
                  label="Upper Ball Joint"
                  clickable
                  variant={form.driver_rear_component?.includes('upper_balljoint') ? 'filled' : 'outlined'}
                  color={form.driver_rear_component?.includes('upper_balljoint') ? 'warning' : 'default'}
                  onClick={() => {
                    const current = form.driver_rear_component || '';
                    const values = current ? current.split(',') : [];
                    const next = values.includes('upper_balljoint') ? values.filter(v => v !== 'upper_balljoint') : [...values, 'upper_balljoint'];
                    onRadioChange('driver_rear_component', next.join(','));
                  }}
                />
                <Chip
                  label="Lower Ball Joint"
                  clickable
                  variant={form.driver_rear_component?.includes('lower_balljoint') ? 'filled' : 'outlined'}
                  color={form.driver_rear_component?.includes('lower_balljoint') ? 'warning' : 'default'}
                  onClick={() => {
                    const current = form.driver_rear_component || '';
                    const values = current ? current.split(',') : [];
                    const next = values.includes('lower_balljoint') ? values.filter(v => v !== 'lower_balljoint') : [...values, 'lower_balljoint'];
                    onRadioChange('driver_rear_component', next.join(','));
                  }}
                />
                <Chip
                  label="Upper Control Arm"
                  clickable
                  variant={form.driver_rear_component?.includes('upper_control_arm') ? 'filled' : 'outlined'}
                  color={form.driver_rear_component?.includes('upper_control_arm') ? 'warning' : 'default'}
                  onClick={() => {
                    const current = form.driver_rear_component || '';
                    const values = current ? current.split(',') : [];
                    const next = values.includes('upper_control_arm') ? values.filter(v => v !== 'upper_control_arm') : [...values, 'upper_control_arm'];
                    onRadioChange('driver_rear_component', next.join(','));
                  }}
                />
                <Chip
                  label="Lower Control Arm"
                  clickable
                  variant={form.driver_rear_component?.includes('lower_control_arm') ? 'filled' : 'outlined'}
                  color={form.driver_rear_component?.includes('lower_control_arm') ? 'warning' : 'default'}
                  onClick={() => {
                    const current = form.driver_rear_component || '';
                    const values = current ? current.split(',') : [];
                    const next = values.includes('lower_control_arm') ? values.filter(v => v !== 'lower_control_arm') : [...values, 'lower_control_arm'];
                    onRadioChange('driver_rear_component', next.join(','));
                  }}
                />
                <Chip
                  label="Outer Tie Rod"
                  clickable
                  variant={form.driver_rear_component?.includes('outer_tie_rod') ? 'filled' : 'outlined'}
                  color={form.driver_rear_component?.includes('outer_tie_rod') ? 'warning' : 'default'}
                  onClick={() => {
                    const current = form.driver_rear_component || '';
                    const values = current ? current.split(',') : [];
                    const next = values.includes('outer_tie_rod') ? values.filter(v => v !== 'outer_tie_rod') : [...values, 'outer_tie_rod'];
                    onRadioChange('driver_rear_component', next.join(','));
                  }}
                />
                <Chip
                  label="Inner Tie Rod"
                  clickable
                  variant={form.driver_rear_component?.includes('inner_tie_rod') ? 'filled' : 'outlined'}
                  color={form.driver_rear_component?.includes('inner_tie_rod') ? 'warning' : 'default'}
                  onClick={() => {
                    const current = form.driver_rear_component || '';
                    const values = current ? current.split(',') : [];
                    const next = values.includes('inner_tie_rod') ? values.filter(v => v !== 'inner_tie_rod') : [...values, 'inner_tie_rod'];
                    onRadioChange('driver_rear_component', next.join(','));
                  }}
                />
              </Box>
            </Box>

            {/* Passenger Rear */}
            <Box sx={{ mt: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                Passenger Rear Components:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label="Frontward Control Arm"
                  clickable
                  variant={form.passenger_rear_component?.includes('frontward_control_arm') ? 'filled' : 'outlined'}
                  color={form.passenger_rear_component?.includes('frontward_control_arm') ? 'warning' : 'default'}
                  onClick={() => {
                    const current = form.passenger_rear_component || '';
                    const values = current ? current.split(',') : [];
                    const next = values.includes('frontward_control_arm') ? values.filter(v => v !== 'frontward_control_arm') : [...values, 'frontward_control_arm'];
                    onRadioChange('passenger_rear_component', next.join(','));
                  }}
                />
                <Chip
                  label="Rearward Control Arm"
                  clickable
                  variant={form.passenger_rear_component?.includes('rearward_control_arm') ? 'filled' : 'outlined'}
                  color={form.passenger_rear_component?.includes('rearward_control_arm') ? 'warning' : 'default'}
                  onClick={() => {
                    const current = form.passenger_rear_component || '';
                    const values = current ? current.split(',') : [];
                    const next = values.includes('rearward_control_arm') ? values.filter(v => v !== 'rearward_control_arm') : [...values, 'rearward_control_arm'];
                    onRadioChange('passenger_rear_component', next.join(','));
                  }}
                />
                <Chip
                  label="Upper Ball Joint"
                  clickable
                  variant={form.passenger_rear_component?.includes('upper_balljoint') ? 'filled' : 'outlined'}
                  color={form.passenger_rear_component?.includes('upper_balljoint') ? 'warning' : 'default'}
                  onClick={() => {
                    const current = form.passenger_rear_component || '';
                    const values = current ? current.split(',') : [];
                    const next = values.includes('upper_balljoint') ? values.filter(v => v !== 'upper_balljoint') : [...values, 'upper_balljoint'];
                    onRadioChange('passenger_rear_component', next.join(','));
                  }}
                />
                <Chip
                  label="Lower Ball Joint"
                  clickable
                  variant={form.passenger_rear_component?.includes('lower_balljoint') ? 'filled' : 'outlined'}
                  color={form.passenger_rear_component?.includes('lower_balljoint') ? 'warning' : 'default'}
                  onClick={() => {
                    const current = form.passenger_rear_component || '';
                    const values = current ? current.split(',') : [];
                    const next = values.includes('lower_balljoint') ? values.filter(v => v !== 'lower_balljoint') : [...values, 'lower_balljoint'];
                    onRadioChange('passenger_rear_component', next.join(','));
                  }}
                />
                <Chip
                  label="Upper Control Arm"
                  clickable
                  variant={form.passenger_rear_component?.includes('upper_control_arm') ? 'filled' : 'outlined'}
                  color={form.passenger_rear_component?.includes('upper_control_arm') ? 'warning' : 'default'}
                  onClick={() => {
                    const current = form.passenger_rear_component || '';
                    const values = current ? current.split(',') : [];
                    const next = values.includes('upper_control_arm') ? values.filter(v => v !== 'upper_control_arm') : [...values, 'upper_control_arm'];
                    onRadioChange('passenger_rear_component', next.join(','));
                  }}
                />
                <Chip
                  label="Lower Control Arm"
                  clickable
                  variant={form.passenger_rear_component?.includes('lower_control_arm') ? 'filled' : 'outlined'}
                  color={form.passenger_rear_component?.includes('lower_control_arm') ? 'warning' : 'default'}
                  onClick={() => {
                    const current = form.passenger_rear_component || '';
                    const values = current ? current.split(',') : [];
                    const next = values.includes('lower_control_arm') ? values.filter(v => v !== 'lower_control_arm') : [...values, 'lower_control_arm'];
                    onRadioChange('passenger_rear_component', next.join(','));
                  }}
                />
                <Chip
                  label="Outer Tie Rod"
                  clickable
                  variant={form.passenger_rear_component?.includes('outer_tie_rod') ? 'filled' : 'outlined'}
                  color={form.passenger_rear_component?.includes('outer_tie_rod') ? 'warning' : 'default'}
                  onClick={() => {
                    const current = form.passenger_rear_component || '';
                    const values = current ? current.split(',') : [];
                    const next = values.includes('outer_tie_rod') ? values.filter(v => v !== 'outer_tie_rod') : [...values, 'outer_tie_rod'];
                    onRadioChange('passenger_rear_component', next.join(','));
                  }}
                />
                <Chip
                  label="Inner Tie Rod"
                  clickable
                  variant={form.passenger_rear_component?.includes('inner_tie_rod') ? 'filled' : 'outlined'}
                  color={form.passenger_rear_component?.includes('inner_tie_rod') ? 'warning' : 'default'}
                  onClick={() => {
                    const current = form.passenger_rear_component || '';
                    const values = current ? current.split(',') : [];
                    const next = values.includes('inner_tie_rod') ? values.filter(v => v !== 'inner_tie_rod') : [...values, 'inner_tie_rod'];
                    onRadioChange('passenger_rear_component', next.join(','));
                  }}
                />
              </Box>
            </Box>
          </Box>
        )}
      </Box>
      )}

    </Box>
  );
};
