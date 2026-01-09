//! New session dialog

use crossterm::event::{KeyCode, KeyEvent};
use ratatui::prelude::*;
use ratatui::widgets::*;

use super::DialogResult;
use crate::tmux::AvailableTools;
use crate::tui::styles::Theme;

pub struct NewSessionData {
    pub title: String,
    pub path: String,
    pub group: String,
    pub tool: String,
}

pub struct NewSessionDialog {
    title: String,
    path: String,
    group: String,
    tool_index: usize,
    focused_field: usize,
    available_tools: Vec<&'static str>,
}

impl NewSessionDialog {
    pub fn new(tools: AvailableTools) -> Self {
        let current_dir = std::env::current_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        let available_tools = tools.available_list();

        Self {
            title: String::new(),
            path: current_dir,
            group: String::new(),
            tool_index: 0,
            focused_field: 0,
            available_tools,
        }
    }

    pub fn handle_key(&mut self, key: KeyEvent) -> DialogResult<NewSessionData> {
        let has_tool_selection = self.available_tools.len() > 1;
        let max_field = if has_tool_selection { 4 } else { 3 };

        match key.code {
            KeyCode::Esc => DialogResult::Cancel,
            KeyCode::Enter => {
                if self.title.is_empty() {
                    self.title = std::path::Path::new(&self.path)
                        .file_name()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_else(|| "untitled".to_string());
                }
                DialogResult::Submit(NewSessionData {
                    title: self.title.clone(),
                    path: self.path.clone(),
                    group: self.group.clone(),
                    tool: self.available_tools[self.tool_index].to_string(),
                })
            }
            KeyCode::Tab => {
                self.focused_field = (self.focused_field + 1) % max_field;
                DialogResult::Continue
            }
            KeyCode::BackTab => {
                self.focused_field = if self.focused_field == 0 {
                    max_field - 1
                } else {
                    self.focused_field - 1
                };
                DialogResult::Continue
            }
            KeyCode::Left | KeyCode::Right if self.focused_field == 3 && has_tool_selection => {
                self.tool_index = (self.tool_index + 1) % self.available_tools.len();
                DialogResult::Continue
            }
            KeyCode::Char(' ') if self.focused_field == 3 && has_tool_selection => {
                self.tool_index = (self.tool_index + 1) % self.available_tools.len();
                DialogResult::Continue
            }
            KeyCode::Backspace => {
                if self.focused_field != 3 || !has_tool_selection {
                    self.current_field_mut().pop();
                }
                DialogResult::Continue
            }
            KeyCode::Char(c) => {
                if self.focused_field != 3 || !has_tool_selection {
                    self.current_field_mut().push(c);
                }
                DialogResult::Continue
            }
            _ => DialogResult::Continue,
        }
    }

    fn current_field_mut(&mut self) -> &mut String {
        match self.focused_field {
            0 => &mut self.title,
            1 => &mut self.path,
            2 => &mut self.group,
            _ => &mut self.title,
        }
    }

    pub fn render(&self, frame: &mut Frame, area: Rect, theme: &Theme) {
        let has_tool_selection = self.available_tools.len() > 1;
        let dialog_width = 60;
        let dialog_height = 14;
        let x = area.x + (area.width.saturating_sub(dialog_width)) / 2;
        let y = area.y + (area.height.saturating_sub(dialog_height)) / 2;

        let dialog_area = Rect {
            x,
            y,
            width: dialog_width.min(area.width),
            height: dialog_height.min(area.height),
        };

        let clear = Clear;
        frame.render_widget(clear, dialog_area);

        let block = Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(theme.accent))
            .title(" New Session ")
            .title_style(Style::default().fg(theme.title).bold());

        let inner = block.inner(dialog_area);
        frame.render_widget(block, dialog_area);

        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .margin(1)
            .constraints([
                Constraint::Length(2),
                Constraint::Length(2),
                Constraint::Length(2),
                Constraint::Length(2),
                Constraint::Min(1),
            ])
            .split(inner);

        let text_fields = [
            ("Title:", &self.title),
            ("Path:", &self.path),
            ("Group:", &self.group),
        ];

        for (idx, (label, value)) in text_fields.iter().enumerate() {
            let is_focused = idx == self.focused_field;
            let style = if is_focused {
                Style::default().fg(theme.accent)
            } else {
                Style::default().fg(theme.text)
            };

            let display_value = if value.is_empty() && idx == 0 {
                "(directory name)"
            } else {
                value.as_str()
            };

            let text = format!("{} {}", label, display_value);
            let cursor = if is_focused { "█" } else { "" };
            let line = Line::from(vec![
                Span::styled(text, style),
                Span::styled(cursor, Style::default().fg(theme.accent)),
            ]);

            frame.render_widget(Paragraph::new(line), chunks[idx]);
        }

        let is_tool_focused = self.focused_field == 3;
        let tool_style = if is_tool_focused && has_tool_selection {
            Style::default().fg(theme.accent)
        } else {
            Style::default().fg(theme.text)
        };

        if has_tool_selection {
            let mut tool_spans = vec![Span::styled("Tool:  ", tool_style)];

            for (idx, tool_name) in self.available_tools.iter().enumerate() {
                let is_selected = idx == self.tool_index;
                let style = if is_selected {
                    Style::default().fg(theme.accent).bold()
                } else {
                    Style::default().fg(theme.dimmed)
                };

                if idx > 0 {
                    tool_spans.push(Span::raw("   "));
                }
                tool_spans.push(Span::styled(if is_selected { "● " } else { "○ " }, style));
                tool_spans.push(Span::styled(*tool_name, style));
            }

            let tool_line = Line::from(tool_spans);
            frame.render_widget(Paragraph::new(tool_line), chunks[3]);
        } else {
            let tool_line = Line::from(vec![
                Span::styled("Tool:  ", tool_style),
                Span::styled(self.available_tools[0], Style::default().fg(theme.accent)),
            ]);
            frame.render_widget(Paragraph::new(tool_line), chunks[3]);
        }

        let hint = if has_tool_selection {
            Line::from(vec![
                Span::styled("Tab", Style::default().fg(theme.hint)),
                Span::raw(" next  "),
                Span::styled("←/→/Space", Style::default().fg(theme.hint)),
                Span::raw(" toggle tool  "),
                Span::styled("Enter", Style::default().fg(theme.hint)),
                Span::raw(" create  "),
                Span::styled("Esc", Style::default().fg(theme.hint)),
                Span::raw(" cancel"),
            ])
        } else {
            Line::from(vec![
                Span::styled("Tab", Style::default().fg(theme.hint)),
                Span::raw(" next  "),
                Span::styled("Enter", Style::default().fg(theme.hint)),
                Span::raw(" create  "),
                Span::styled("Esc", Style::default().fg(theme.hint)),
                Span::raw(" cancel"),
            ])
        };
        frame.render_widget(Paragraph::new(hint), chunks[4]);
    }
}
