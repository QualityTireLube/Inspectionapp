/**
 * Popup Renderer - Renders popup content based on type
 * 
 * Handles different popup content types and provides consistent
 * styling and interaction patterns.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  MobileStepper,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon
} from '@mui/icons-material';
import { PopupDefinition, PopupContent } from '../types/PopupTypes';

interface PopupRendererProps {
  definition: PopupDefinition;
  isOpen: boolean;
  onClose: () => void;
  context?: Record<string, any>;
}

export const PopupRenderer: React.FC<PopupRendererProps> = ({
  definition,
  isOpen,
  onClose,
  context = {}
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const { content, position = 'center', size = 'medium', modal = true } = definition;

  // Get dialog size
  const getDialogSize = () => {
    switch (size) {
      case 'small': return { maxWidth: 'sm' as const, width: 400 };
      case 'medium': return { maxWidth: 'md' as const, width: 600 };
      case 'large': return { maxWidth: 'lg' as const, width: 800 };
      case 'xlarge': return { maxWidth: 'xl' as const, width: 1000 };
      case 'auto': return { maxWidth: false as const };
      case 'custom': return { 
        maxWidth: false as const, 
        width: definition.width || 600,
        height: definition.height || 400
      };
      default: return { maxWidth: 'md' as const };
    }
  };

  const dialogProps = getDialogSize();

  const renderContent = () => {
    switch (content.type) {
      case 'image':
        return <ImageContent content={content} />;
      
      case 'image_gallery':
        return (
          <ImageGalleryContent 
            content={content} 
            currentStep={currentStep}
            onStepChange={setCurrentStep}
          />
        );
      
      case 'video':
        return (
          <VideoContent 
            content={content}
            isPlaying={isPlaying}
            onPlayStateChange={setIsPlaying}
          />
        );
      
      case 'tutorial':
        return (
          <TutorialContent
            content={content}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
          />
        );
      
      case 'html':
        return <HtmlContent content={content} />;
      
      case 'markdown':
        return <MarkdownContent content={content} />;
      
      case 'component':
        return <ComponentContent content={content} context={context} />;
      
      case 'help':
        return <HelpContent content={content} />;
      
      case 'warning':
        return <WarningContent content={content} />;
      
      case 'confirmation':
        return <ConfirmationContent content={content} onClose={onClose} />;
      
      default:
        return (
          <Typography variant="body1">
            {content.message || content.title}
          </Typography>
        );
    }
  };

  const renderActions = () => {
    if (!content.actions || content.actions.length === 0) {
      return (
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      );
    }

    return content.actions.map((action, index) => (
      <Button
        key={index}
        variant={action.variant === 'primary' ? 'contained' : 'outlined'}
        color={action.variant === 'danger' ? 'error' : 'primary'}
        onClick={() => {
          if (action.handler) {
            action.handler();
          }
          if (action.action === 'close') {
            onClose();
          }
        }}
      >
        {action.label}
      </Button>
    ));
  };

  return (
    <Dialog
      open={isOpen}
      onClose={definition.closable !== false ? onClose : undefined}
      {...dialogProps}
      fullScreen={position === 'fullscreen'}
      className={definition.className}
      style={definition.style}
      disableEscapeKeyDown={!definition.closable}
    >
      {definition.title && (
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{definition.title}</Typography>
          {definition.closable !== false && (
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
      )}
      
      <DialogContent>
        {renderContent()}
      </DialogContent>
      
      <DialogActions>
        {renderActions()}
      </DialogActions>
    </Dialog>
  );
};

// Content type components
const ImageContent: React.FC<{ content: PopupContent }> = ({ content }) => (
  <Card>
    <CardMedia
      component="img"
      image={content.imageUrl}
      alt={content.imageAlt || 'Popup image'}
      sx={{ maxHeight: 400, objectFit: 'contain' }}
    />
    {content.caption && (
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {content.caption}
        </Typography>
      </CardContent>
    )}
  </Card>
);

const ImageGalleryContent: React.FC<{ 
  content: PopupContent; 
  currentStep: number;
  onStepChange: (step: number) => void;
}> = ({ content, currentStep, onStepChange }) => {
  const images = content.images || [];
  const maxSteps = images.length;

  if (maxSteps === 0) return null;

  const currentImage = images[currentStep];

  return (
    <Box>
      <Card>
        <CardMedia
          component="img"
          image={currentImage.url}
          alt={currentImage.alt || `Image ${currentStep + 1}`}
          sx={{ maxHeight: 400, objectFit: 'contain' }}
        />
        {currentImage.caption && (
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              {currentImage.caption}
            </Typography>
          </CardContent>
        )}
      </Card>
      
      <MobileStepper
        steps={maxSteps}
        position="static"
        activeStep={currentStep}
        nextButton={
          <Button
            size="small"
            onClick={() => onStepChange(currentStep + 1)}
            disabled={currentStep === maxSteps - 1}
          >
            Next <NextIcon />
          </Button>
        }
        backButton={
          <Button
            size="small"
            onClick={() => onStepChange(currentStep - 1)}
            disabled={currentStep === 0}
          >
            <PrevIcon /> Back
          </Button>
        }
      />
    </Box>
  );
};

const VideoContent: React.FC<{ 
  content: PopupContent;
  isPlaying: boolean;
  onPlayStateChange: (playing: boolean) => void;
}> = ({ content, isPlaying, onPlayStateChange }) => {
  const getVideoSrc = () => {
    if (content.videoType === 'youtube') {
      const videoId = content.videoUrl?.split('v=')[1] || content.videoUrl?.split('/').pop();
      return `https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}`;
    }
    return content.videoUrl;
  };

  return (
    <Box>
      {content.videoType === 'youtube' ? (
        <iframe
          width="100%"
          height="315"
          src={getVideoSrc()}
          frameBorder="0"
          allowFullScreen
        />
      ) : (
        <video
          width="100%"
          height="315"
          controls
          autoPlay={isPlaying}
          onPlay={() => onPlayStateChange(true)}
          onPause={() => onPlayStateChange(false)}
        >
          <source src={content.videoUrl} type={`video/${content.videoType || 'mp4'}`} />
          Your browser does not support the video tag.
        </video>
      )}
      
      {content.caption && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {content.caption}
        </Typography>
      )}
    </Box>
  );
};

const TutorialContent: React.FC<{
  content: PopupContent;
  currentStep: number;
  onStepChange: (step: number) => void;
}> = ({ content, currentStep, onStepChange }) => {
  const steps = content.steps || [];
  const maxSteps = steps.length;

  if (maxSteps === 0) return null;

  const currentStepData = steps[currentStep];

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        {steps.map((_, index) => (
          <Chip
            key={index}
            label={`${index + 1}`}
            variant={index === currentStep ? 'filled' : 'outlined'}
            color={index === currentStep ? 'primary' : 'default'}
            size="small"
          />
        ))}
      </Box>
      
      <Typography variant="h6" gutterBottom>
        {currentStepData.title}
      </Typography>
      
      {currentStepData.image && (
        <img
          src={currentStepData.image}
          alt={currentStepData.title}
          style={{ width: '100%', maxHeight: 200, objectFit: 'contain', marginBottom: 16 }}
        />
      )}
      
      <Typography variant="body1">
        {currentStepData.content}
      </Typography>
    </Box>
  );
};

const HtmlContent: React.FC<{ content: PopupContent }> = ({ content }) => (
  <div dangerouslySetInnerHTML={{ __html: content.html || '' }} />
);

const MarkdownContent: React.FC<{ content: PopupContent }> = ({ content }) => (
  <Typography component="div" variant="body1">
    {/* TODO: Add markdown parser */}
    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
      {content.markdown}
    </pre>
  </Typography>
);

const ComponentContent: React.FC<{ 
  content: PopupContent; 
  context: Record<string, any>;
}> = ({ content, context }) => {
  if (!content.component) return null;
  
  const Component = content.component;
  return <Component {...content.componentProps} context={context} />;
};

const HelpContent: React.FC<{ content: PopupContent }> = ({ content }) => (
  <Box>
    {content.title && (
      <Typography variant="h6" gutterBottom>
        {content.title}
      </Typography>
    )}
    <Typography variant="body1">
      {content.message}
    </Typography>
  </Box>
);

const WarningContent: React.FC<{ content: PopupContent }> = ({ content }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <Box sx={{ color: 'warning.main', fontSize: 40 }}>⚠️</Box>
    <Box>
      {content.title && (
        <Typography variant="h6" color="warning.main" gutterBottom>
          {content.title}
        </Typography>
      )}
      <Typography variant="body1">
        {content.message}
      </Typography>
    </Box>
  </Box>
);

const ConfirmationContent: React.FC<{ 
  content: PopupContent;
  onClose: () => void;
}> = ({ content, onClose }) => (
  <Box>
    {content.title && (
      <Typography variant="h6" gutterBottom>
        {content.title}
      </Typography>
    )}
    <Typography variant="body1" sx={{ mb: 3 }}>
      {content.message}
    </Typography>
  </Box>
);
