//config.settings.slate.contextToolbarButtons
import RichTextWidget from 'volto-slate-italia/components/manage/Widgets/RichTextWidget';
import HtmlSlateWidget from 'volto-slate-italia/components/manage/Widgets/HtmlSlateWidget';
import installAlignment from 'volto-slate-italia/config/Slate/Alignment';
import installHeadings from 'volto-slate-italia/config/Slate/Headings';
import installUnderline from 'volto-slate-italia/config/Slate/Underline';
import installBlockquote from 'volto-slate-italia/config/Slate/Blockquote';
import installLinkButton from 'volto-slate-italia/config/Slate/LinkButton';
import installTextLarger from 'volto-slate-italia/config/Slate/TextLarger';
import installLink from 'volto-slate-italia/config/Slate/Link';

import installHandlers from 'volto-slate-italia/config/Slate/handlers';
import installDeserializers from 'volto-slate-italia/config/Slate/deserializers';

export { RichTextWidget, HtmlSlateWidget };

export default function applyItaliaSlateConfig(config) {
  installAlignment(config);
  installHeadings(config);
  installUnderline(config);
  installTextLarger(config);
  installLink(config);
  installBlockquote(config);
  installLinkButton(config);

  installHandlers(config);
  installDeserializers(config);

  //remove callout because there's a Volto's block for it
  delete config.settings.slate.elements.callout;
  delete config.settings.slate.buttons.callout;
  config.settings.slate.toolbarButtons =
    config.settings.slate.toolbarButtons.filter((b) => b !== 'callout');
  config.settings.slate.expandedToolbarButtons =
    config.settings.slate.toolbarButtons.filter((b) => b !== 'callout');

  //add wrapper public-ui to widgets
  config.widgets.widget.slate = RichTextWidget;
  config.widgets.widget.slate_richtext = RichTextWidget;
  config.widgets.widget.slate_html = HtmlSlateWidget;
  config.widgets.widget.richtext = HtmlSlateWidget;
  return config;
}
