# Post-Migration TODO

- Remove the Hugo tab shortcode compatibility layer in `docusaurus/plugins/hugo-mdx-preprocess-loader.cjs`:
  - `tabpane` -> `Tabs`
  - `tab` -> `TabItem`
- Migrate any remaining docs that still use Hugo tab shortcodes to native Docusaurus tabs:
  - `import Tabs from '@theme/Tabs';`
  - `import TabItem from '@theme/TabItem';`
  - `<Tabs> ... <TabItem ...> ... </TabItem> ... </Tabs>`
- After migration, verify no `{{< tabpane ... >}}` / `{{% tab ... %}}` usages remain and then delete the conversion code.
- Replace remaining Hugo flavor shortcodes with native MDX components and then remove shortcode conversion for:
  - `{{< flavorCode >}}` -> `<FlavorCode />`
  - `{{< flavorReleaseCode >}}` -> `<FlavorReleaseCode />`
  from `docusaurus/plugins/hugo-mdx-preprocess-loader.cjs`.
- Uncomment `editUrl` in `docusaurus/docusaurus.config.ts` to re-enable "Edit this page" links (disabled in 4 places: docs preset, blog preset, getting-started plugin, quickstart plugin).
