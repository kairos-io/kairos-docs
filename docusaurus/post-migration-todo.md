# Post-Migration TODO

- Remove the Hugo tab shortcode compatibility layer in `docusaurus/plugins/hugo-mdx-preprocess-loader.cjs`:
  - `tabpane` -> `Tabs`
  - `tab` -> `TabItem`
- Migrate any remaining docs that still use Hugo tab shortcodes to native Docusaurus tabs:
  - `import Tabs from '@theme/Tabs';`
  - `import TabItem from '@theme/TabItem';`
  - `<Tabs> ... <TabItem ...> ... </TabItem> ... </Tabs>`
- After migration, verify no `{{< tabpane ... >}}` / `{{% tab ... %}}` usages remain and then delete the conversion code.
