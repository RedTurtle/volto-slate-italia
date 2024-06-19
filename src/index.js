import applyItaliaSlateConfig from 'volto-slate-italia/config/Slate/config';
import TextEditorWidget from 'volto-slate-italia/components/manage/Widgets/TextEditorWidget';

export { TextEditorWidget };

const applyConfig = (voltoConfig) => {
  let config = applyItaliaSlateConfig(voltoConfig);
  config.settings['volto-slate-italia'] = {
    enhanceLinkComponent:
      null /* import { EnhanceLink } from 'io-sanita-theme/helpers';*/,
    externalLinkMarker:
      null /* import { Icon } from 'io-sanita-theme/components';
    <Icon
    icon="it-external-link"
    size="xs"
    className="ms-1 align-sub external-link"
  />*/,
  };
  return config;
};

export default applyConfig;
