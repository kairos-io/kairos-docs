#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HUGO_DIR="${ROOT_DIR}/content/en"
HUGO_STATIC_DIR="${ROOT_DIR}/static"
HUGO_LAYOUTS_DIR="${ROOT_DIR}/layouts"
HUGO_ASSETS_DIR="${ROOT_DIR}/assets"
DOCUSAURUS_DIR="${ROOT_DIR}/docusaurus/docs"
DOCUSAURUS_GETTING_STARTED_DIR="${ROOT_DIR}/docusaurus/getting-started"
DOCUSAURUS_QUICKSTART_DIR="${ROOT_DIR}/docusaurus/quickstart"
DOCUSAURUS_BLOG_DIR="${ROOT_DIR}/docusaurus/blog"
DOCUSAURUS_SITE_PAGES_DIR="${ROOT_DIR}/docusaurus/src/pages"
DOCUSAURUS_STATIC_DIR="${ROOT_DIR}/docusaurus/static"
DOCUSAURUS_CONFIG="${ROOT_DIR}/docusaurus/docusaurus.config.ts"

declare -A hugo_pages=()
declare -A hugo_draft_pages=()
declare -A docusaurus_pages=()
declare -A hugo_urls=()
declare -A hugo_draft_urls=()
declare -A hugo_url_to_page=()
declare -A docusaurus_urls=()
declare -A docusaurus_page_to_url=()
declare -A docusaurus_url_to_page=()
declare -A requested_identifiers=()
declare -a requested_pages=()
declare -a selected_urls=()

SHOW_DIFF=0
if [[ "${DIFF:-0}" == "1" ]]; then
  SHOW_DIFF=1
fi
SHOW_ALL=0
if [[ "${ALL:-0}" == "1" ]]; then
  SHOW_ALL=1
fi

PRESENT_FILTER="${PRESENT:-all}"
OUTPUT_MODE="${OUTPUT:-table}"
SUMMARY_ENABLED="${SUMMARY:-1}"

case "${PRESENT_FILTER}" in
  all|file|auto|missing) ;;
  *) echo "ERROR: PRESENT must be one of: all|file|auto|missing" >&2; exit 2 ;;
esac
case "${OUTPUT_MODE}" in
  table|list) ;;
  *) echo "ERROR: OUTPUT must be one of: table|list" >&2; exit 2 ;;
esac
case "${SUMMARY_ENABLED}" in
  0|1) ;;
  *) echo "ERROR: SUMMARY must be 0 or 1" >&2; exit 2 ;;
esac

COLOR_RED=""
COLOR_GREEN=""
COLOR_ORANGE=""
COLOR_RESET=""

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  COLOR_RED=$'\033[31m'
  COLOR_GREEN=$'\033[32m'
  COLOR_ORANGE=$'\033[33m'
  COLOR_RESET=$'\033[0m'
fi

canonical_page_id() {
  local rel="$1"
  local no_ext="${rel%.*}"
  local file_name="${no_ext##*/}"
  local dir_name
  dir_name="$(dirname "${no_ext}")"

  if [[ "${file_name}" == "_index" || "${file_name}" == "index" ]]; then
    if [[ "${dir_name}" == "." ]]; then
      echo "index"
    else
      echo "${dir_name}/index"
    fi
  else
    if [[ "${dir_name}" == "." ]]; then
      echo "${file_name}"
    else
      echo "${dir_name}/${file_name}"
    fi
  fi
}

normalize_url_path() {
  local raw="$1"
  local path="${raw}"

  path="${path#http://}"
  path="${path#https://}"
  if [[ "${path}" != "${raw}" ]]; then
    path="/${path#*/}"
  fi

  path="/${path#/}"
  path="${path%%\?*}"
  path="${path%%\#*}"

  if [[ "${path}" != "/" && "${path}" == */ ]]; then
    path="${path%/}"
  fi

  echo "${path}"
}

parse_args() {
  if [[ $# -gt 0 && -d "$1" ]]; then
    HUGO_DIR="$1"
    shift
  fi

  if [[ $# -gt 0 && -d "$1" ]]; then
    DOCUSAURUS_DIR="$1"
    shift
  fi

  while [[ $# -gt 0 ]]; do
    requested_pages+=("$1")
    shift
  done
}

normalize_requested_page_id() {
  local input="$1"
  local rel="${input}"
  local blog_page_id
  local static_rel

  rel="${rel#./}"
  rel="${rel#${ROOT_DIR}/}"

  if [[ "${rel}" == static/* ]]; then
    static_rel="${rel#static/}"
    echo "static/${static_rel}"
    return
  fi
  if [[ "${rel}" == docusaurus/static/* ]]; then
    static_rel="${rel#docusaurus/static/}"
    echo "static/${static_rel}"
    return
  fi
  if [[ "${rel}" == docusaurus/quickstart/* ]]; then
    rel="${rel#docusaurus/quickstart/}"
    echo "quickstart/$(canonical_page_id "${rel}")"
    return
  fi
  if [[ "${rel}" == docusaurus/getting-started/* ]]; then
    rel="${rel#docusaurus/getting-started/}"
    echo "getting-started/$(canonical_page_id "${rel}")"
    return
  fi
  if [[ "${rel}" == quickstart/* && ( "${rel}" == *.md || "${rel}" == *.mdx ) ]]; then
    rel="${rel#quickstart/}"
    echo "quickstart/$(canonical_page_id "${rel}")"
    return
  fi
  if [[ "${rel}" == getting-started/* && ( "${rel}" == *.md || "${rel}" == *.mdx ) ]]; then
    rel="${rel#getting-started/}"
    echo "getting-started/$(canonical_page_id "${rel}")"
    return
  fi

  rel="${rel#${DOCUSAURUS_BLOG_DIR}/}"
  rel="${rel#${HUGO_DIR}/}"
  rel="${rel#${DOCUSAURUS_DIR}/}"
  rel="${rel#/}"

  if [[ "${input}" == *"/docusaurus/blog/"* || "${input}" == docusaurus/blog/* || "${input}" == "./docusaurus/blog/"* ]]; then
    blog_page_id="$(docusaurus_blog_page_id_from_file "${input}")"
    if [[ -n "${blog_page_id}" ]]; then
      echo "${blog_page_id}"
      return
    fi
  fi
  rel="${rel#content/en/}"
  rel="${rel#docusaurus/docs/}"
  rel="${rel#docs/}"

  echo "$(canonical_page_id "${rel}")"
}

is_draft_file() {
  local file="$1"
  [[ -f "${file}" ]] || { echo "0"; return; }

  awk '
    NR == 1 && ($0 == "---" || $0 == "+++") {
      in_fm = 1
      delimiter = $0
      next
    }

    in_fm == 1 && $0 == delimiter {
      in_fm = 0
      exit
    }

    in_fm == 1 {
      line = tolower($0)
      gsub(/[[:space:]]+/, "", line)
      if (line ~ /^draft:(true|1)$/ || line ~ /^draft=(true|1)$/) {
        print "1"
        found = 1
        exit
      }
    }

    END {
      if (!found) {
        print "0"
      }
    }
  ' "${file}" 2>/dev/null || echo "0"
}

collect_pages() {
  local base_dir="$1"
  local target_name="$2"
  local file rel page_id

  while IFS= read -r -d '' file; do
    rel="${file#${base_dir}/}"
    if [[ "${target_name}" == "hugo" && "${rel}" == docs/* ]]; then
      rel="${rel#docs/}"
    fi
    page_id="$(canonical_page_id "${rel}")"
    if [[ "$(is_draft_file "${file}")" == "1" ]]; then
      if [[ "${target_name}" == "hugo" ]]; then
        hugo_draft_pages["${page_id}"]="${file}"
      fi
      continue
    fi
    if [[ "${target_name}" == "hugo" ]]; then
      hugo_pages["${page_id}"]="${file}"
    else
      docusaurus_pages["${page_id}"]="${file}"
    fi
  done < <(find "${base_dir}" -type f \( -name "*.md" -o -name "*.mdx" \) -print0)
}

collect_hugo_urls() {
  local line src permalink path rel page_id src_file
  while IFS= read -r line; do
    [[ -z "${line}" ]] && continue
    [[ "${line}" == path,* ]] && continue

    src="${line%%,*}"
    permalink="$(printf '%s\n' "${line}" | grep -oE 'https?://[^,]+' | head -n1 || true)"
    [[ -z "${permalink}" ]] && continue

    if [[ "${src}" == content/en/* ]]; then
      src_file="${ROOT_DIR}/${src}"
      if [[ "$(is_draft_file "${src_file}")" == "1" ]]; then
        path="$(normalize_url_path "${permalink}")"
        hugo_draft_urls["${path}"]=1
        continue
      fi
    fi

    path="$(normalize_url_path "${permalink}")"
    hugo_urls["${path}"]=1

    if [[ "${src}" == content/en/* ]]; then
      rel="${src#content/en/}"
      if [[ "${rel}" == docs/* ]]; then
        rel="${rel#docs/}"
      fi
      page_id="$(canonical_page_id "${rel}")"
      if [[ -n "${hugo_pages[${page_id}]-}" ]]; then
        hugo_url_to_page["${path}"]="${page_id}"
      fi
    fi
  done < <(hugo list all 2>/dev/null || true)

  # Important generated URLs that are part of the migration surface.
  hugo_urls["/"]=1
  hugo_urls["/sitemap.xml"]=1
}

collect_hugo_static_urls() {
  local file rel url page_id
  [[ -d "${HUGO_STATIC_DIR}" ]] || return

  while IFS= read -r -d '' file; do
    rel="${file#${HUGO_STATIC_DIR}/}"
    page_id="static/${rel}"
    url="$(normalize_url_path "/${rel}")"

    hugo_pages["${page_id}"]="${file}"
    hugo_urls["${url}"]=1
    hugo_url_to_page["${url}"]="${page_id}"
  done < <(find "${HUGO_STATIC_DIR}" -type f -print0)
}

collect_hugo_generated_root_urls() {
  # Generated by Hugo templates/assets pipeline, so include URLs but treat content as review.
  if [[ -f "${HUGO_LAYOUTS_DIR}/robots.txt" ]]; then
    hugo_urls["/robots.txt"]=1
  fi

  if [[ -f "${HUGO_ASSETS_DIR}/llms.go.txt" ]] && grep -q "llmsTXT[[:space:]]*=[[:space:]]*true" "${ROOT_DIR}/hugo.toml" 2>/dev/null; then
    hugo_urls["/llms.txt"]=1
  fi
}

get_docusaurus_current_docs_path() {
  local current_path
  current_path="$(
    awk '
      /current:[[:space:]]*\{/ { in_current=1 }
      in_current && /path:[[:space:]]*["'\''][^"'\'']*["'\'']/ {
        if (match($0, /path:[[:space:]]*["'\'']([^"'\'']*)["'\'']/, m)) {
          print m[1]
          exit
        }
      }
      in_current && /\}/ { in_current=0 }
    ' "${DOCUSAURUS_CONFIG}" 2>/dev/null || true
  )"

  # Empty path means current docs are served under /docs/.
  # If no current path is explicitly set, fall back to Docusaurus default "next".
  if grep -q "current:[[:space:]]*{" "${DOCUSAURUS_CONFIG}" 2>/dev/null; then
    echo "${current_path}"
    return
  fi
  echo "next"
}

get_docusaurus_docs_prefix() {
  local current_path docs_prefix
  current_path="$(get_docusaurus_current_docs_path)"
  if [[ "${current_path}" == "/" || -z "${current_path}" ]]; then
    docs_prefix="/docs"
  else
    docs_prefix="/docs/${current_path#/}"
  fi
  docs_prefix="${docs_prefix%/}"
  echo "${docs_prefix}"
}

collect_docusaurus_urls() {
  local current_path docs_prefix rel page_id no_ext file_name dir_name url slug
  current_path="$(get_docusaurus_current_docs_path)"
  docs_prefix="$(get_docusaurus_docs_prefix)"

  while IFS= read -r -d '' file; do
    rel="${file#${DOCUSAURUS_DIR}/}"
    page_id="$(canonical_page_id "${rel}")"
    slug="$(frontmatter_value "${file}" "slug")"

    no_ext="${rel%.*}"
    file_name="${no_ext##*/}"
    dir_name="$(dirname "${no_ext}")"

    if [[ -n "${slug}" ]]; then
      if [[ "${slug}" == /* ]]; then
        url="${docs_prefix}${slug}"
      else
        url="${docs_prefix}/${slug}"
      fi
    else
      if [[ "${file_name}" == "_index" || "${file_name}" == "index" ]]; then
        if [[ "${dir_name}" == "." ]]; then
          url="${docs_prefix}/"
        else
          url="${docs_prefix}/${dir_name}/"
        fi
      else
        if [[ "${dir_name}" == "." ]]; then
          url="${docs_prefix}/${file_name}/"
        else
          url="${docs_prefix}/${dir_name}/${file_name}/"
        fi
      fi
    fi

    url="$(normalize_url_path "${url}")"
    docusaurus_urls["${url}"]=1
    docusaurus_page_to_url["${page_id}"]="${url}"
    docusaurus_url_to_page["${url}"]="${page_id}"
  done < <(find "${DOCUSAURUS_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \) -print0)

  if [[ -f "${ROOT_DIR}/docusaurus/src/pages/index.tsx" || -f "${ROOT_DIR}/docusaurus/src/pages/index.md" || -f "${ROOT_DIR}/docusaurus/src/pages/index.mdx" ]]; then
    docusaurus_urls["/"]=1
  fi
  docusaurus_urls["/sitemap.xml"]=1
}

collect_docusaurus_quickstart_urls() {
  local rel local_page_id page_id no_ext file_name dir_name url slug
  [[ -d "${DOCUSAURUS_QUICKSTART_DIR}" ]] || return

  while IFS= read -r -d '' file; do
    rel="${file#${DOCUSAURUS_QUICKSTART_DIR}/}"
    local_page_id="$(canonical_page_id "${rel}")"
    page_id="quickstart/${local_page_id}"
    slug="$(frontmatter_value "${file}" "slug")"

    no_ext="${rel%.*}"
    file_name="${no_ext##*/}"
    dir_name="$(dirname "${no_ext}")"

    if [[ -n "${slug}" ]]; then
      if [[ "${slug}" == /* ]]; then
        url="/quickstart${slug}"
      else
        url="/quickstart/${slug}"
      fi
    else
      if [[ "${file_name}" == "_index" || "${file_name}" == "index" ]]; then
        if [[ "${dir_name}" == "." ]]; then
          url="/quickstart/"
        else
          url="/quickstart/${dir_name}/"
        fi
      else
        if [[ "${dir_name}" == "." ]]; then
          url="/quickstart/${file_name}/"
        else
          url="/quickstart/${dir_name}/${file_name}/"
        fi
      fi
    fi

    url="$(normalize_url_path "${url}")"
    docusaurus_urls["${url}"]=1
    docusaurus_pages["${page_id}"]="${file}"
    docusaurus_page_to_url["${page_id}"]="${url}"
    docusaurus_url_to_page["${url}"]="${page_id}"
  done < <(find "${DOCUSAURUS_QUICKSTART_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \) -print0)
}

collect_docusaurus_getting_started_urls() {
  local rel local_page_id page_id no_ext file_name dir_name url slug
  [[ -d "${DOCUSAURUS_GETTING_STARTED_DIR}" ]] || return

  while IFS= read -r -d '' file; do
    rel="${file#${DOCUSAURUS_GETTING_STARTED_DIR}/}"
    local_page_id="$(canonical_page_id "${rel}")"
    page_id="getting-started/${local_page_id}"
    slug="$(frontmatter_value "${file}" "slug")"

    no_ext="${rel%.*}"
    file_name="${no_ext##*/}"
    dir_name="$(dirname "${no_ext}")"

    if [[ -n "${slug}" ]]; then
      if [[ "${slug}" == /* ]]; then
        url="/getting-started${slug}"
      else
        url="/getting-started/${slug}"
      fi
    else
      if [[ "${file_name}" == "_index" || "${file_name}" == "index" ]]; then
        if [[ "${dir_name}" == "." ]]; then
          url="/getting-started/"
        else
          url="/getting-started/${dir_name}/"
        fi
      else
        if [[ "${dir_name}" == "." ]]; then
          url="/getting-started/${file_name}/"
        else
          url="/getting-started/${dir_name}/${file_name}/"
        fi
      fi
    fi

    url="$(normalize_url_path "${url}")"
    docusaurus_urls["${url}"]=1
    docusaurus_pages["${page_id}"]="${file}"
    docusaurus_page_to_url["${page_id}"]="${url}"
    docusaurus_url_to_page["${url}"]="${page_id}"
  done < <(find "${DOCUSAURUS_GETTING_STARTED_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \) -print0)
}

collect_docusaurus_category_urls() {
  local docs_prefix file rel_dir slug url
  docs_prefix="$(get_docusaurus_docs_prefix)"

  while IFS= read -r -d '' file; do
    if ! grep -q '"type"[[:space:]]*:[[:space:]]*"generated-index"' "${file}"; then
      continue
    fi

    slug="$(sed -n 's/.*"slug"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${file}" | head -n1)"
    rel_dir="${file#${DOCUSAURUS_DIR}/}"
    rel_dir="${rel_dir%/_category_.json}"

    if [[ -n "${slug}" ]]; then
      url="${docs_prefix}/${slug#/}"
    else
      url="${docs_prefix}/category/${rel_dir}"
    fi

    url="$(normalize_url_path "${url}")"
    docusaurus_urls["${url}"]=1
  done < <(find "${DOCUSAURUS_DIR}" -type f -name "_category_.json" -print0)
}

frontmatter_value() {
  local file="$1"
  local key="$2"
  awk -v wanted="${key}" '
    NR==1 && $0=="---" { fm=1; next }
    fm==1 && $0=="---" { fm=0; exit }
    fm==1 {
      if ($0 ~ "^[[:space:]]*" wanted ":[[:space:]]*") {
        line=$0
        sub("^[[:space:]]*" wanted ":[[:space:]]*", "", line)
        gsub(/^["'\'']|["'\'']$/, "", line)
        print line
        exit
      }
    }
  ' "${file}" 2>/dev/null || true
}

docusaurus_blog_slug_from_file() {
  local file="$1"
  local slug filename
  slug="$(frontmatter_value "${file}" "slug")"
  if [[ -z "${slug}" ]]; then
    filename="$(basename "${file}")"
    filename="${filename%.*}"
    slug="$(printf '%s\n' "${filename}" | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-//')"
  fi

  slug="${slug#/}"
  slug="${slug%/}"
  slug="${slug#blog/}"
  echo "${slug}" | tr '[:upper:]' '[:lower:]'
}

docusaurus_blog_date_parts_from_file() {
  local file="$1"
  local date_raw filename year month day
  date_raw="$(frontmatter_value "${file}" "date")"

  if [[ "${date_raw}" =~ ^([0-9]{4})-([0-9]{2})-([0-9]{2}) ]]; then
    echo "${BASH_REMATCH[1]} ${BASH_REMATCH[2]} ${BASH_REMATCH[3]}"
    return
  fi

  filename="$(basename "${file}")"
  if [[ "${filename}" =~ ^([0-9]{4})-([0-9]{2})-([0-9]{2})- ]]; then
    year="${BASH_REMATCH[1]}"
    month="${BASH_REMATCH[2]}"
    day="${BASH_REMATCH[3]}"
    echo "${year} ${month} ${day}"
    return
  fi

  echo ""
}

docusaurus_blog_page_id_from_file() {
  local file="$1"
  local resolved="${file}"
  local slug

  if [[ "${resolved}" != /* ]]; then
    resolved="${ROOT_DIR}/${resolved#./}"
  fi
  [[ -f "${resolved}" ]] || { echo ""; return; }

  slug="$(docusaurus_blog_slug_from_file "${resolved}")"
  [[ -n "${slug}" ]] || { echo ""; return; }
  echo "blog/${slug}"
}

collect_docusaurus_blog_urls() {
  local file slug page_id date_parts year month day url
  [[ -d "${DOCUSAURUS_BLOG_DIR}" ]] || return

  while IFS= read -r -d '' file; do
    slug="$(docusaurus_blog_slug_from_file "${file}")"
    [[ -n "${slug}" ]] || continue
    page_id="blog/${slug}"
    docusaurus_pages["${page_id}"]="${file}"

    date_parts="$(docusaurus_blog_date_parts_from_file "${file}")"
    if [[ -n "${date_parts}" ]]; then
      read -r year month day <<< "${date_parts}"
      url="/blog/${year}/${month}/${day}/${slug}"
    else
      url="/blog/${slug}"
    fi
    url="$(normalize_url_path "${url}")"
    docusaurus_urls["${url}"]=1
    docusaurus_page_to_url["${page_id}"]="${url}"
    docusaurus_url_to_page["${url}"]="${page_id}"
  done < <(find "${DOCUSAURUS_BLOG_DIR}" -type f \( -name "*.md" -o -name "*.mdx" \) -print0)

  docusaurus_urls["/blog"]=1
}

collect_docusaurus_site_page_urls() {
  local file rel no_ext file_name dir_name url page_id
  [[ -d "${DOCUSAURUS_SITE_PAGES_DIR}" ]] || return

  while IFS= read -r -d '' file; do
    rel="${file#${DOCUSAURUS_SITE_PAGES_DIR}/}"
    no_ext="${rel%.*}"
    file_name="${no_ext##*/}"
    dir_name="$(dirname "${no_ext}")"

    # Docusaurus does not create routes for underscore-prefixed files.
    if [[ "${file_name}" == _* ]]; then
      continue
    fi

    if [[ "${file_name}" == "index" ]]; then
      if [[ "${dir_name}" == "." ]]; then
        url="/"
      else
        url="/${dir_name}/"
      fi
    else
      if [[ "${dir_name}" == "." ]]; then
        url="/${file_name}/"
      else
        url="/${dir_name}/${file_name}/"
      fi
    fi

    url="$(normalize_url_path "${url}")"
    page_id="site/${no_ext}"
    docusaurus_urls["${url}"]=1
    docusaurus_pages["${page_id}"]="${file}"
    docusaurus_page_to_url["${page_id}"]="${url}"
    docusaurus_url_to_page["${url}"]="${page_id}"
  done < <(find "${DOCUSAURUS_SITE_PAGES_DIR}" -type f \( -name "*.md" -o -name "*.mdx" -o -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -print0)
}

collect_docusaurus_static_urls() {
  local file rel url page_id
  [[ -d "${DOCUSAURUS_STATIC_DIR}" ]] || return

  while IFS= read -r -d '' file; do
    rel="${file#${DOCUSAURUS_STATIC_DIR}/}"
    page_id="static/${rel}"
    url="$(normalize_url_path "/${rel}")"

    docusaurus_pages["${page_id}"]="${file}"
    docusaurus_urls["${url}"]=1
    docusaurus_page_to_url["${page_id}"]="${url}"
    docusaurus_url_to_page["${url}"]="${page_id}"
  done < <(find "${DOCUSAURUS_STATIC_DIR}" -type f -print0)
}

normalize_content() {
  local file_path="$1"
  awk '
    {
      sub(/\r$/, "", $0)
    }

    NR == 1 && ($0 == "---" || $0 == "+++") {
      frontmatter = 1
      delimiter = $0
      next
    }

    frontmatter == 1 {
      if ($0 == delimiter) {
        frontmatter = 0
      }
      next
    }

    {
      sub(/[ \t]+$/, "", $0)
      lines[++count] = $0
    }

    END {
      start = 1
      while (start <= count && lines[start] ~ /^[[:space:]]*$/) {
        start++
      }
      while (count > 0 && lines[count] ~ /^[[:space:]]*$/) {
        count--
      }
      for (i = start; i <= count; i++) {
        print lines[i]
      }
    }
  ' "${file_path}" | perl -0777 -ne '
    my $text = $_;

    sub trim {
      my ($value) = @_;
      $value =~ s/^\s+//;
      $value =~ s/\s+$//;
      return $value;
    }

    sub normalize_attrs {
      my ($attrs) = @_;
      $attrs //= q{};
      $attrs = trim($attrs);
      $attrs =~ s/\s*=\s*/=/g;
      $attrs =~ s/\s+/ /g;
      return $attrs;
    }

    sub normalize_component_name {
      my ($name) = @_;
      $name = trim($name);
      return lc($name);
    }

    sub canonical_doc_ref {
      my ($value) = @_;
      $value //= q{};
      $value = trim($value);
      $value =~ s/^["'\'']|["'\'']$//g;
      $value =~ s{\\}{/}g;
      $value =~ s/[?#].*$//;
      $value =~ s/\.mdx?$//i;
      $value =~ s#^/+##;
      # Remove relative prefixes without corrupting "../" into "."
      $value =~ s#^(?:(?:\./)|(?:\.\./))+##;
      $value =~ s#^docs/##i;
      $value =~ s#/$##;
      return lc($value);
    }

    sub unescape_jsx_string {
      my ($value) = @_;
      $value =~ s/\\\\/\\__BACKSLASH__/g;
      $value =~ s/\\n/\n/g;
      $value =~ s/\\t/\t/g;
      $value =~ s/\\"/"/g;
      $value =~ s/\\x27/'\''/g;
      $value =~ s/\\'\''/'\''/g;
      $value =~ s/\\__BACKSLASH__/\\/g;
      return $value;
    }

    # Normalize flavor placeholders across Hugo/Docusaurus syntaxes.
    $text =~ s/\{\{<\s*flavor(?:code)?\s*>\}\}/__FLAVOR__/gmi;
    $text =~ s/\{\{<\s*flavorrelease(?:code)?\s*>\}\}/__FLAVOR_RELEASE__/gmi;
    $text =~ s/\{\{\s*flavor\s*\}\}/__FLAVOR__/gmi;
    $text =~ s/\{\{\s*flavorrelease\s*\}\}/__FLAVOR_RELEASE__/gmi;
    $text =~ s/\@flavorRelease\b/__FLAVOR_RELEASE__/g;
    $text =~ s/\@flavor\b/__FLAVOR__/g;

    # Normalize internal docs references so relref/ref and relative links match.
    $text =~ s/\{\{<\s*(?:relref|ref)\s+"([^"]+)"\s*>\}\}/"__DOCREF__[" . canonical_doc_ref($1) . "]"/gexi;
    $text =~ s/\]\((?!https?:|mailto:|#|__DOCREF__)([^)\s]+)(?:\s+"[^"]*")?\)/"](__DOCREF__[" . canonical_doc_ref($1) . "])"/gei;
    $text =~ s{(?<![A-Za-z0-9])(?:\.\./|\./)+(?:advanced|announcements|architecture|development|examples|installation|media|reference|upgrade|getting-started|quickstart|docs)(?:/[A-Za-z0-9._-]+)+/?}{"__DOCREF__[" . canonical_doc_ref($&) . "]"}gexi;
    $text =~ s{(?<![A-Za-z0-9])/?docs(?:/[A-Za-z0-9._-]+)+/?}{"__DOCREF__[" . canonical_doc_ref($&) . "]"}gexi;
    $text =~ s/\((__DOCREF__\[[^\]]+\])\s+"[^"]*"\)/($1)/g;
    $text =~ s/(__DOCREF__\[[^\]]+\])#[A-Za-z0-9._:-]+/$1/g;

    $text =~ s/^\s*\{\{%\s*alert\b[^\n]*%\}\}\s*$\n?/__ADMONITION_START__\n/gm;
    $text =~ s/^\s*\{\{%\s*\/alert\s*%\}\}\s*$\n?/__ADMONITION_END__\n/gm;
    $text =~ s/^\s*:::(?:tip|note|info|warning|danger|caution)\b[^\n]*$\n?/__ADMONITION_START__\n/gmi;
    $text =~ s/^\s*:::\s*$\n?/__ADMONITION_END__\n/gm;
    $text =~ s/__ADMONITION_START__\n(?:[ \t]*\n)+/__ADMONITION_START__\n/g;
    $text =~ s/(?:\n[ \t]*)+\n__ADMONITION_END__/\n__ADMONITION_END__/g;

    $text =~ s/^\s*```[^\n]*$\n?//gm;
    $text =~ s/^\s*<\/?(?:pre|code)>\s*$\n?//gmi;
    $text =~ s/\{\s*'\''((?:\\\\|\\'\''|[^'\''])*)'\''\s*\}/unescape_jsx_string($1)/ge;

    $text =~ s/\{\{<\s*([A-Za-z][A-Za-z0-9_-]*)\s*([^}]*)>\}\}/
      my $name = normalize_component_name($1);
      my $attrs = normalize_attrs($2);
      "__SC__[$name][$attrs]";
    /gex;

    $text =~ s/<([A-Z][A-Za-z0-9_]*)\b([^>]*)\/>/
      my $name = normalize_component_name($1);
      my $attrs = normalize_attrs($2);
      "__SC__[$name][$attrs]";
    /gex;

    my @lines = split(/\n/, $text, -1);
    for my $line (@lines) {
      $line =~ s/[ \t]+$//;
    }
    while (@lines && $lines[-1] =~ /^\s*$/) {
      pop @lines;
    }

    print join("\n", @lines);
    print "\n" if @lines;
  '
}

hash_content() {
  local file="$1"
  local ext="${file##*.}"
  ext="$(echo "${ext}" | tr '[:upper:]' '[:lower:]')"

  case "${ext}" in
    md|mdx|markdown|mdown|mkdn|js|jsx|ts|tsx)
      normalize_content "${file}" | sha256sum | awk "{print \$1}"
      ;;
    *)
      sha256sum "${file}" | awk "{print \$1}"
      ;;
  esac
}

print_page_diff() {
  local url_path="$1"
  local hugo_file="$2"
  local docusaurus_file="$3"
  local hugo_tmp docusaurus_tmp
  local hugo_ext docusaurus_ext

  echo
  echo "Diff for ${url_path}:"

  hugo_ext="${hugo_file##*.}"
  docusaurus_ext="${docusaurus_file##*.}"
  hugo_ext="$(echo "${hugo_ext}" | tr '[:upper:]' '[:lower:]')"
  docusaurus_ext="$(echo "${docusaurus_ext}" | tr '[:upper:]' '[:lower:]')"

  case "${hugo_ext}:${docusaurus_ext}" in
    md:md|md:mdx|mdx:md|mdx:mdx|markdown:md|markdown:mdx|mdown:md|mdown:mdx|mkdn:md|mkdn:mdx|js:js|jsx:jsx|ts:ts|tsx:tsx|js:ts|ts:js|jsx:tsx|tsx:jsx)
      hugo_tmp="$(mktemp)"
      docusaurus_tmp="$(mktemp)"
      normalize_content "${hugo_file}" > "${hugo_tmp}"
      normalize_content "${docusaurus_file}" > "${docusaurus_tmp}"
      diff -u --label "hugo:${url_path}" --label "docusaurus:${url_path}" "${hugo_tmp}" "${docusaurus_tmp}" || true
      rm -f "${hugo_tmp}" "${docusaurus_tmp}"
      ;;
    *)
      diff -u --label "hugo:${url_path}" --label "docusaurus:${url_path}" "${hugo_file}" "${docusaurus_file}" || true
      ;;
  esac
}

print_permalink_diff() {
  local url_path="$1"
  local page_id="$2"
  local mapped_url=""

  if [[ -n "${page_id}" ]]; then
    mapped_url="${docusaurus_page_to_url[${page_id}]-}"
  fi

  echo
  echo "Permalink mismatch for ${url_path}:"
  echo "  expected: ${url_path}"
  if [[ -n "${mapped_url}" ]]; then
    echo "  docusaurus_mapped: ${mapped_url}"
    diff -u --label "expected" --label "docusaurus_mapped" <(printf "%s\n" "${url_path}") <(printf "%s\n" "${mapped_url}") || true
  else
    echo "  docusaurus_mapped: (no mapped doc page)"
  fi
}

color_cell() {
  local value="$1"
  local color="$2"
  printf "%s%s%s" "${color}" "${value}" "${COLOR_RESET}"
}

parse_args "$@"

if [[ ! -d "${HUGO_DIR}" ]]; then
  echo "ERROR: Hugo docs directory not found: ${HUGO_DIR}" >&2
  exit 2
fi
if [[ ! -d "${DOCUSAURUS_DIR}" ]]; then
  echo "ERROR: Docusaurus docs directory not found: ${DOCUSAURUS_DIR}" >&2
  exit 2
fi

collect_pages "${HUGO_DIR}" "hugo"
collect_pages "${DOCUSAURUS_DIR}" "docusaurus"
collect_hugo_urls
collect_hugo_static_urls
collect_hugo_generated_root_urls
collect_docusaurus_urls
collect_docusaurus_getting_started_urls
collect_docusaurus_quickstart_urls
collect_docusaurus_category_urls
collect_docusaurus_blog_urls
collect_docusaurus_site_page_urls
collect_docusaurus_static_urls

if [[ "${#requested_pages[@]}" -gt 0 ]]; then
  for requested in "${requested_pages[@]}"; do
    if [[ "${requested}" == /* || "${requested}" =~ ^https?:// ]]; then
      requested_url="$(normalize_url_path "${requested}")"
      requested_identifiers["url:${requested_url}"]=1
    fi
    requested_page_id="$(normalize_requested_page_id "${requested}")"
    requested_identifiers["page:${requested_page_id}"]=1
  done
fi

hugo_file_backed_total="${#hugo_pages[@]}"
docusaurus_file_backed_total="${#docusaurus_pages[@]}"
hugo_url_total="${#hugo_urls[@]}"

total_rows=0
displayed_rows=0
present_ok=0
present_autogen=0
present_missing=0
permalink_ok=0
content_ok=0
content_review=0
content_mismatch=0
row_errors=0

while IFS= read -r url_path; do
  [[ -z "${url_path}" ]] && continue
  page_id="${hugo_url_to_page[${url_path}]-}"
  docusaurus_page_id="${docusaurus_url_to_page[${url_path}]-}"

  if [[ "${#requested_identifiers[@]}" -gt 0 ]]; then
    include=0
    if [[ -n "${requested_identifiers[url:${url_path}]-}" ]]; then
      include=1
    elif [[ -n "${page_id}" && -n "${requested_identifiers[page:${page_id}]-}" ]]; then
      include=1
    elif [[ -n "${docusaurus_page_id}" && -n "${requested_identifiers[page:${docusaurus_page_id}]-}" ]]; then
      include=1
    fi
    if [[ "${include}" -eq 0 ]]; then
      continue
    fi
  fi
  selected_urls+=("${url_path}")
done < <(printf "%s\n" "${!hugo_urls[@]}" | sort)

url_col_width=8
for url_path in "${selected_urls[@]}"; do
  if (( ${#url_path} > url_col_width )); then
    url_col_width=${#url_path}
  fi
done

url_sep=""
printf -v url_sep "%*s" "${url_col_width}" ""
url_sep="${url_sep// /-}"
present_col_width=10
permalink_col_width=9
content_col_width=10
present_sep="----------"
permalink_sep="---------"
content_sep="----------"

echo "Comparing migration coverage using Hugo URL paths as source of truth"
echo
if [[ "${OUTPUT_MODE}" == "table" ]]; then
  printf "| %-*s | %-*s | %-*s | %-*s |\n" \
    "${url_col_width}" "URL Path" \
    "${present_col_width}" "Present" \
    "${permalink_col_width}" "Permalink" \
    "${content_col_width}" "Content"
  printf "| %-*s | %-*s | %-*s | %-*s |\n" \
    "${url_col_width}" "${url_sep}" \
    "${present_col_width}" "${present_sep}" \
    "${permalink_col_width}" "${permalink_sep}" \
    "${content_col_width}" "${content_sep}"
fi

for url_path in "${selected_urls[@]}"; do
  page_id="${hugo_url_to_page[${url_path}]-}"
  docusaurus_page_id="${docusaurus_url_to_page[${url_path}]-}"
  total_rows=$((total_rows + 1))

  present="❌"
  permalink="❌"
  content="❌"

  hugo_file=""
  docusaurus_file=""
  docusaurus_file_from_url=""
  docusaurus_file_from_page_id=""
  if [[ -n "${page_id}" ]]; then
    hugo_file="${hugo_pages[${page_id}]-}"
    docusaurus_file_from_page_id="${docusaurus_pages[${page_id}]-}"
  fi
  if [[ -n "${docusaurus_page_id}" ]]; then
    docusaurus_file_from_url="${docusaurus_pages[${docusaurus_page_id}]-}"
  fi

  if [[ -n "${docusaurus_file_from_url}" ]]; then
    docusaurus_file="${docusaurus_file_from_url}"
  elif [[ -n "${docusaurus_file_from_page_id}" ]]; then
    docusaurus_file="${docusaurus_file_from_page_id}"
  fi

  if [[ -n "${docusaurus_file}" ]]; then
    present="✅"
    present_ok=$((present_ok + 1))
  elif [[ -n "${docusaurus_urls[${url_path}]-}" ]]; then
    present="🔁"
    present_autogen=$((present_autogen + 1))
  else
    present_missing=$((present_missing + 1))
  fi

  if [[ -n "${docusaurus_urls[${url_path}]-}" ]]; then
    permalink="✅"
    permalink_ok=$((permalink_ok + 1))
  elif [[ "${SHOW_DIFF}" -eq 1 ]]; then
    print_permalink_diff "${url_path}" "${page_id}"
  fi

  if [[ -n "${hugo_file}" && -n "${docusaurus_file}" ]]; then
    if [[ "$(hash_content "${hugo_file}")" == "$(hash_content "${docusaurus_file}")" ]]; then
      content="✅"
      content_ok=$((content_ok + 1))
    elif [[ "${SHOW_DIFF}" -eq 1 ]]; then
      content_mismatch=$((content_mismatch + 1))
      print_page_diff "${url_path}" "${hugo_file}" "${docusaurus_file}"
    else
      content_mismatch=$((content_mismatch + 1))
    fi
  elif [[ "${present}" != "❌" ]]; then
    content="👀"
    content_review=$((content_review + 1))
  fi

  if [[ "${present}" == "❌" ]]; then
    row_errors=$((row_errors + 1))
  fi

  case "${present}" in
    "✅") present_cell="file" ;;
    "🔁") present_cell="auto" ;;
    *) present_cell="missing" ;;
  esac
  case "${permalink}" in
    "✅") permalink_cell="same" ;;
    *) permalink_cell="diff" ;;
  esac
  case "${content}" in
    "✅") content_cell="match" ;;
    "👀") content_cell="review" ;;
    *) content_cell="diff" ;;
  esac

  if [[ "${PRESENT_FILTER}" != "all" && "${present_cell}" != "${PRESENT_FILTER}" ]]; then
    continue
  fi

  hide_row=0
  if [[ "${#requested_identifiers[@]}" -eq 0 && "${SHOW_ALL}" -eq 0 ]]; then
    if [[ "${present_cell}" == "file" && "${permalink_cell}" == "same" && "${content_cell}" == "match" ]]; then
      hide_row=1
    fi
  fi

  if [[ "${hide_row}" -eq 1 ]]; then
    continue
  fi
  displayed_rows=$((displayed_rows + 1))

  printf -v present_cell_padded "%-*s" "${present_col_width}" "${present_cell}"
  printf -v permalink_cell_padded "%-*s" "${permalink_col_width}" "${permalink_cell}"
  printf -v content_cell_padded "%-*s" "${content_col_width}" "${content_cell}"

  if [[ "${present_cell}" == "file" || "${present_cell}" == "auto" ]]; then
    present_cell_colored="$(color_cell "${present_cell_padded}" "${COLOR_GREEN}")"
  elif [[ "${present_cell}" == "missing" ]]; then
    present_cell_colored="$(color_cell "${present_cell_padded}" "${COLOR_RED}")"
  else
    present_cell_colored="$(color_cell "${present_cell_padded}" "${COLOR_ORANGE}")"
  fi

  if [[ "${permalink_cell}" == "same" ]]; then
    permalink_cell_colored="$(color_cell "${permalink_cell_padded}" "${COLOR_GREEN}")"
  else
    permalink_cell_colored="$(color_cell "${permalink_cell_padded}" "${COLOR_RED}")"
  fi

  if [[ "${content_cell}" == "match" ]]; then
    content_cell_colored="$(color_cell "${content_cell_padded}" "${COLOR_GREEN}")"
  elif [[ "${content_cell}" == "review" ]]; then
    content_cell_colored="$(color_cell "${content_cell_padded}" "${COLOR_ORANGE}")"
  else
    content_cell_colored="$(color_cell "${content_cell_padded}" "${COLOR_RED}")"
  fi

  if [[ "${OUTPUT_MODE}" == "list" ]]; then
    printf "%s\n" "${url_path}"
  else
    printf "| %-*s | %s | %s | %s |\n" \
      "${url_col_width}" "${url_path}" \
      "${present_cell_colored}" \
      "${permalink_cell_colored}" \
      "${content_cell_colored}"
  fi
done

if [[ "${#requested_identifiers[@]}" -gt 0 && "${total_rows}" -eq 0 ]]; then
  unresolved_non_draft=0
  for key in "${!requested_identifiers[@]}"; do
    if [[ "${key}" == url:* ]]; then
      requested_url="${key#url:}"
      if [[ -z "${hugo_draft_urls[${requested_url}]-}" ]]; then
        unresolved_non_draft=1
        break
      fi
    elif [[ "${key}" == page:* ]]; then
      requested_page_id="${key#page:}"
      if [[ -z "${hugo_draft_pages[${requested_page_id}]-}" ]]; then
        unresolved_non_draft=1
        break
      fi
    fi
  done
  if [[ "${unresolved_non_draft}" -eq 1 ]]; then
    row_errors=1
  else
    row_errors=0
  fi
fi

if [[ "${SUMMARY_ENABLED}" == "1" ]]; then
  echo
  echo "Summary:"
  echo "  hugo_file_backed_total: ${hugo_file_backed_total}"
  echo "  docusaurus_file_backed_total: ${docusaurus_file_backed_total}"
  echo "  hugo_url_total: ${hugo_url_total}"
  echo "  rows_checked: ${total_rows}"
  echo "  rows_displayed: ${displayed_rows}"
  echo "  present_ok: ${present_ok}"
  echo "  present_autogen: ${present_autogen}"
  echo "  present_missing: ${present_missing}"
  echo "  permalink_ok: ${permalink_ok}"
  echo "  content_ok: ${content_ok}"
  echo "  content_review: ${content_review}"
  echo "  content_mismatch: ${content_mismatch}"
  echo "  row_errors: ${row_errors}"
fi

if [[ "${row_errors}" -gt 0 ]]; then
  exit 1
fi
exit 0
