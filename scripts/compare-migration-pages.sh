#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HUGO_DIR="${ROOT_DIR}/content/en"
DOCUSAURUS_DIR="${ROOT_DIR}/docusaurus/docs"

if [[ ! -d "${HUGO_DIR}" ]]; then
  echo "ERROR: Hugo docs directory not found: ${HUGO_DIR}" >&2
  exit 2
fi

if [[ ! -d "${DOCUSAURUS_DIR}" ]]; then
  echo "ERROR: Docusaurus docs directory not found: ${DOCUSAURUS_DIR}" >&2
  exit 2
fi

declare -A hugo_pages=()
declare -A docusaurus_pages=()
declare -A all_pages=()
declare -a requested_pages=()
SHOW_DIFF=0

if [[ "${DIFF:-0}" == "1" ]]; then
  SHOW_DIFF=1
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

  rel="${rel#${HUGO_DIR}/}"
  rel="${rel#${DOCUSAURUS_DIR}/}"
  rel="${rel#content/en/}"
  rel="${rel#docusaurus/docs/}"
  rel="${rel#docs/}"

  echo "$(canonical_page_id "${rel}")"
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
    if [[ "${target_name}" == "hugo" ]]; then
      hugo_pages["${page_id}"]="${file}"
    else
      docusaurus_pages["${page_id}"]="${file}"
    fi
    all_pages["${page_id}"]=1
  done < <(find "${base_dir}" -type f \( -name "*.md" -o -name "*.mdx" \) -print0)
}

normalize_content() {
  local file_path="$1"
  awk '
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
      while (count > 0 && lines[count] ~ /^[[:space:]]*$/) {
        count--
      }
      for (i = 1; i <= count; i++) {
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

    # Normalize Hugo alerts and Docusaurus admonitions to the same wrapper markers.
    $text =~ s/^\s*\{\{%\s*alert\b[^\n]*%\}\}\s*$\n?/__ADMONITION_START__\n/gm;
    $text =~ s/^\s*\{\{%\s*\/alert\s*%\}\}\s*$\n?/__ADMONITION_END__\n/gm;
    $text =~ s/^\s*:::(?:tip|note|info|warning|danger|caution)\b[^\n]*$\n?/__ADMONITION_START__\n/gmi;
    $text =~ s/^\s*:::\s*$\n?/__ADMONITION_END__\n/gm;
    $text =~ s/__ADMONITION_START__\n(?:[ \t]*\n)+/__ADMONITION_START__\n/g;
    $text =~ s/(?:\n[ \t]*)+\n__ADMONITION_END__/\n__ADMONITION_END__/g;

    # Strip markdown code fences and HTML pre/code wrappers so equivalent code content compares equally.
    $text =~ s/^\s*```[^\n]*$\n?//gm;
    $text =~ s/^\s*<\/?(?:pre|code)>\s*$\n?//gmi;

    # Resolve MDX JSX string chunks like {'\''$ ls\n'\''} into plain text.
    $text =~ s/\{\s*'\''((?:\\\\|\\'\''|[^'\''])*)'\''\s*\}/unescape_jsx_string($1)/ge;

    # Normalize Hugo shortcodes to canonical tokens.
    $text =~ s/\{\{<\s*([A-Za-z][A-Za-z0-9_-]*)\s*([^}]*)>\}\}/
      my $name = normalize_component_name($1);
      my $attrs = normalize_attrs($2);
      "__SC__[$name][$attrs]";
    /gex;

    # Normalize MDX self-closing component tags to the same canonical token format.
    $text =~ s/<([A-Z][A-Za-z0-9_]*)\b([^>]*)\/>/
      my $name = normalize_component_name($1);
      my $attrs = normalize_attrs($2);
      "__SC__[$name][$attrs]";
    /gex;

    # Re-trim trailing spaces and trailing blank lines after transformations.
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
  normalize_content "$1" | sha256sum | awk '{print $1}'
}

print_page_diff() {
  local page_id="$1"
  local hugo_file="$2"
  local docusaurus_file="$3"
  local hugo_tmp docusaurus_tmp

  hugo_tmp="$(mktemp)"
  docusaurus_tmp="$(mktemp)"

  normalize_content "${hugo_file}" > "${hugo_tmp}"
  normalize_content "${docusaurus_file}" > "${docusaurus_tmp}"

  echo
  echo "Diff for ${page_id}:"
  if ! diff -u --label "hugo:${page_id}" --label "docusaurus:${page_id}" "${hugo_tmp}" "${docusaurus_tmp}"; then
    true
  fi

  rm -f "${hugo_tmp}" "${docusaurus_tmp}"
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

total=0
ok=0
only_hugo=0
only_docusaurus=0
different=0
not_found=0

echo "Comparing Hugo pages in ${HUGO_DIR} with Docusaurus pages in ${DOCUSAURUS_DIR}"
echo
printf "%-12s %s\n" "STATUS" "PAGE"
printf "%-12s %s\n" "------" "----"

if [[ "${#requested_pages[@]}" -gt 0 ]]; then
  declare -A requested_set=()
  for requested_page in "${requested_pages[@]}"; do
    normalized_page_id="$(normalize_requested_page_id "${requested_page}")"
    requested_set["${normalized_page_id}"]=1
  done
  page_list="$(printf "%s\n" "${!requested_set[@]}" | sort)"
else
  page_list="$(printf "%s\n" "${!all_pages[@]}" | sort)"
fi

while IFS= read -r page_id; do
  [[ -z "${page_id}" ]] && continue
  total=$((total + 1))

  hugo_file="${hugo_pages[${page_id}]-}"
  docusaurus_file="${docusaurus_pages[${page_id}]-}"

  if [[ -z "${hugo_file}" && -z "${docusaurus_file}" ]]; then
    not_found=$((not_found + 1))
    printf "%-12s %s\n" "ERROR_NOT_FOUND" "${page_id}"
    continue
  fi

  if [[ -n "${hugo_file}" && -z "${docusaurus_file}" ]]; then
    only_hugo=$((only_hugo + 1))
    printf "%-12s %s\n" "ERROR_ONLY_HUGO" "${page_id}"
    continue
  fi

  if [[ -z "${hugo_file}" && -n "${docusaurus_file}" ]]; then
    only_docusaurus=$((only_docusaurus + 1))
    printf "%-12s %s\n" "ERROR_ONLY_DOCUSAURUS" "${page_id}"
    continue
  fi

  hugo_hash="$(hash_content "${hugo_file}")"
  docusaurus_hash="$(hash_content "${docusaurus_file}")"

  if [[ "${hugo_hash}" == "${docusaurus_hash}" ]]; then
    ok=$((ok + 1))
    printf "%-12s %s\n" "OK" "${page_id}"
  else
    different=$((different + 1))
    printf "%-12s %s\n" "ERROR_DIFFERENT" "${page_id}"
    if [[ "${SHOW_DIFF}" -eq 1 ]]; then
      print_page_diff "${page_id}" "${hugo_file}" "${docusaurus_file}"
    fi
  fi
done < <(printf "%s\n" "${page_list}")

errors=$((only_hugo + only_docusaurus + different + not_found))

echo
echo "Summary:"
echo "  total_pages: ${total}"
echo "  ok: ${ok}"
echo "  error_only_hugo: ${only_hugo}"
echo "  error_only_docusaurus: ${only_docusaurus}"
echo "  error_different: ${different}"
echo "  error_not_found: ${not_found}"
echo "  errors_total: ${errors}"

if [[ "${errors}" -gt 0 ]]; then
  exit 1
fi

exit 0
